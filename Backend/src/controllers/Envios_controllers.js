import crypto from 'node:crypto';
import pool from '../database.js';

const ROLES_SOLICITUD = new Set(['solicitante', 'jefe', 'administrador']);

const registrarEvento = async (connection, idPaquete, fase, idActor, detalles = null) => {
	await connection.query(
		`INSERT INTO Eventos_Process_Mining
			(ID_Transaccion, Tipo_Modulo, Fase_Estado, ID_Usuario_Actor, Detalles_Extra)
		 VALUES (?, 'PAQUETERIA', ?, ?, ?)`,
		[idPaquete, fase, idActor, detalles ? JSON.stringify(detalles) : null]
	);
};

const obtenerCatalogosEnvio = async (req, res) => {
	try {
		const [plantas] = await pool.query(
			'SELECT ID_Planta AS id, Nombre_Planta AS nombre FROM Plantas ORDER BY Nombre_Planta'
		);
		const [areas] = await pool.query(
			'SELECT ID_AREAS AS id, AREA AS nombre FROM Areas ORDER BY AREA'
		);
		const [colaboradores] = await pool.query(
			`SELECT ID_COLABORADOR AS id, NOMBRE AS nombre
				, AREA AS areaId
			 FROM Colaboradores
			 WHERE ESTADO = 'ACTIVO'
			 ORDER BY NOMBRE`
		);

		return res.status(200).json({ success: true, plantas, areas, colaboradores });
	} catch (error) {
		return res.status(500).json({ msg: 'No se pudieron cargar los catálogos', error: error.message });
	}
};

const crearEnvioPaqueteria = async (req, res) => {
	const connection = await pool.getConnection();
	try {
		const rol = (req.user?.rol || '').toLowerCase();
		if (!ROLES_SOLICITUD.has(rol)) {
			return res.status(403).json({ msg: 'No tienes permiso para crear solicitudes de paquetería' });
		}

		const {
			fecha_salida,
			hora_entrega,
			tipo_contenido,
			comentario,
			id_planta_origen,
			id_area_origen,
			id_responsable,
			id_planta_destino,
			id_area_destino,
			id_destinatario,
		} = req.body;

		const responsable = Number(id_responsable || req.user.id);
		const camposRequeridos = [
			fecha_salida,
			tipo_contenido,
			id_planta_origen,
			id_area_origen,
			responsable,
			id_planta_destino,
			id_area_destino,
			id_destinatario,
		];

		if (camposRequeridos.some((campo) => campo === undefined || campo === null || campo === '')) {
			return res.status(400).json({ msg: 'Completa todos los campos obligatorios de la solicitud' });
		}

		if (String(id_planta_origen) === String(id_planta_destino)) {
			return res.status(400).json({ msg: 'La planta de origen y la planta de destino deben ser diferentes' });
		}

		if (String(responsable) === String(id_destinatario)) {
			return res.status(400).json({ msg: 'El responsable y el destinatario deben ser diferentes' });
		}

		const idPaquete = crypto.randomUUID();
		const qrToken = `PAQUETERIA|${idPaquete}`;
		await connection.beginTransaction();

		const [responsableValido] = await connection.query(
			`SELECT ID_COLABORADOR FROM Colaboradores
			 WHERE ID_COLABORADOR = ? AND ESTADO = 'ACTIVO'`,
			[responsable]
		);
		const [destinatarioValido] = await connection.query(
			`SELECT ID_COLABORADOR FROM Colaboradores
			 WHERE ID_COLABORADOR = ? AND ESTADO = 'ACTIVO'`,
			[id_destinatario]
		);
		if (!responsableValido.length || !destinatarioValido.length) {
			await connection.rollback();
			return res.status(400).json({ msg: 'El responsable o destinatario no es un colaborador activo' });
		}

		await connection.query(
			`INSERT INTO Envios_Paqueteria
				(ID_Paquete, Fecha_Salida, Hora_Entrega, Tipo_Contenido, Comentario,
					 ID_Planta_Origen, ID_Area_Origen, ID_Responsable,
					 ID_Planta_Destino, ID_Area_Destino, ID_Destinatario, Estado_Actual, QR_Token)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Solicitado', ?)`,
			[
				idPaquete,
				fecha_salida,
				hora_entrega || null,
				tipo_contenido.trim(),
				comentario?.trim() || null,
				id_planta_origen,
				id_area_origen,
				responsable,
				id_planta_destino,
				id_area_destino,
				id_destinatario,
				qrToken,
			]
		);

		await registrarEvento(connection, idPaquete, 'Solicitado', req.user.id, { tipo_contenido: tipo_contenido.trim() });

		await connection.commit();
		return res.status(201).json({ success: true, msg: 'Solicitud de paquetería creada', idPaquete, qrToken });
	} catch (error) {
		await connection.rollback();
		return res.status(500).json({ msg: 'No se pudo crear la solicitud de paquetería', error: error.message });
	} finally {
		connection.release();
	}
};

const obtenerEnviosPaqueteria = async (req, res) => {
	try {
		const rol = (req.user?.rol || '').toLowerCase();
		let filtro = '';
		const params = [];

		if (!['administrador', 'supervisor'].includes(rol)) {
			filtro = 'WHERE e.ID_Responsable = ? OR e.ID_Destinatario = ?';
			params.push(req.user.id, req.user.id);
		}

		const [envios] = await pool.query(
			`SELECT e.*,
							resp.NOMBRE AS responsable_nombre,
							dest.NOMBRE AS destinatario_nombre,
							po.Nombre_Planta AS planta_origen_nombre,
							pd.Nombre_Planta AS planta_destino_nombre,
							area_origen.AREA AS area_origen_nombre,
							area_destino.AREA AS area_destino_nombre
			 FROM Envios_Paqueteria e
			 INNER JOIN Colaboradores resp ON resp.ID_COLABORADOR = e.ID_Responsable
			 INNER JOIN Colaboradores dest ON dest.ID_COLABORADOR = e.ID_Destinatario
			 INNER JOIN Plantas po ON po.ID_Planta = e.ID_Planta_Origen
			 INNER JOIN Plantas pd ON pd.ID_Planta = e.ID_Planta_Destino
			INNER JOIN Areas area_origen ON area_origen.ID_AREAS = e.ID_Area_Origen
			INNER JOIN Areas area_destino ON area_destino.ID_AREAS = e.ID_Area_Destino
			 ${filtro}
			 ORDER BY e.Fecha_Creacion DESC`,
			params
		);

		return res.status(200).json({ success: true, envios });
	} catch (error) {
		return res.status(500).json({ msg: 'No se pudo cargar el historial de paquetería', error: error.message });
	}
};

export { obtenerCatalogosEnvio, crearEnvioPaqueteria, obtenerEnviosPaqueteria, registrarEvento };
