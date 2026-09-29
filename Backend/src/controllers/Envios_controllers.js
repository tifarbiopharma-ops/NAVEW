import crypto from 'node:crypto';
import pool from '../database.js';
import { obtenerJefeDirecto } from '../utils/jerarquia.js';

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
		const [departamentos] = await pool.query(
			'SELECT ID_DEPARTAMENTOS AS id, DEPARTAMENTO AS nombre FROM Departamentos ORDER BY DEPARTAMENTO'
		);
		const [colaboradores] = await pool.query(
			`SELECT ID_COLABORADOR AS id, NOMBRE AS nombre
			 FROM Colaboradores
			 WHERE ESTADO = 'ACTIVO'
			 ORDER BY NOMBRE`
		);

		return res.status(200).json({ success: true, plantas, departamentos, colaboradores });
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
			id_departamento_origen,
			id_responsable,
			id_planta_destino,
			id_departamento_destino,
			id_destinatario,
		} = req.body;

		const responsable = Number(id_responsable || req.user.id);
		const camposRequeridos = [
			fecha_salida,
			tipo_contenido,
			id_planta_origen,
			id_departamento_origen,
			responsable,
			id_planta_destino,
			id_departamento_destino,
			id_destinatario,
		];

		if (camposRequeridos.some((campo) => campo === undefined || campo === null || campo === '')) {
			return res.status(400).json({ msg: 'Completa todos los campos obligatorios de la solicitud' });
		}

		const idPaquete = crypto.randomUUID();
		const idAprobador = await obtenerJefeDirecto(req.user.id);
		if (!idAprobador) {
			return res.status(400).json({ msg: 'No se encontró un jefe directo para aprobar la solicitud' });
		}

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
				 ID_Planta_Origen, ID_Departamento_Origen, ID_Responsable,
				 ID_Planta_Destino, ID_Departamento_Destino, ID_Destinatario, Estado_Actual)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SOLICITADO')`,
			[
				idPaquete,
				fecha_salida,
				hora_entrega || null,
				tipo_contenido.trim(),
				comentario?.trim() || null,
				id_planta_origen,
				id_departamento_origen,
				responsable,
				id_planta_destino,
				id_departamento_destino,
				id_destinatario,
			]
		);

		await connection.query(
			`INSERT INTO Aprobaciones
				(TIPO_SOLICITUD, ID_SOLICITUD, NIVEL_APROBACION, ID_APROBADOR, ESTADO)
			 VALUES ('PAQUETERIA', ?, 1, ?, 'PENDIENTE')`,
			[idPaquete, idAprobador]
		);
		await registrarEvento(connection, idPaquete, 'SOLICITADO', req.user.id, { tipo_contenido: tipo_contenido.trim() });

		await connection.commit();
		return res.status(201).json({ success: true, msg: 'Solicitud de paquetería creada', idPaquete });
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

		if (rol === 'jefe') {
			filtro = `WHERE e.ID_Responsable = ? OR EXISTS (
				SELECT 1 FROM Aprobaciones a
				WHERE a.ID_SOLICITUD = e.ID_Paquete
					AND a.TIPO_SOLICITUD = 'PAQUETERIA'
					AND a.ID_APROBADOR = ?
			)`;
			params.push(req.user.id, req.user.id);
		} else if (!['administrador', 'supervisor'].includes(rol)) {
			filtro = 'WHERE e.ID_Responsable = ? OR e.ID_Destinatario = ?';
			params.push(req.user.id, req.user.id);
		}

		const [envios] = await pool.query(
			`SELECT e.*,
							resp.NOMBRE AS responsable_nombre,
							dest.NOMBRE AS destinatario_nombre,
							po.Nombre_Planta AS planta_origen_nombre,
							pd.Nombre_Planta AS planta_destino_nombre,
							  dep_origen.DEPARTAMENTO AS departamento_origen_nombre,
							  dep_destino.DEPARTAMENTO AS departamento_destino_nombre
			 FROM Envios_Paqueteria e
			 INNER JOIN Colaboradores resp ON resp.ID_COLABORADOR = e.ID_Responsable
			 INNER JOIN Colaboradores dest ON dest.ID_COLABORADOR = e.ID_Destinatario
			 INNER JOIN Plantas po ON po.ID_Planta = e.ID_Planta_Origen
			 INNER JOIN Plantas pd ON pd.ID_Planta = e.ID_Planta_Destino
			INNER JOIN Departamentos dep_origen ON dep_origen.ID_DEPARTAMENTOS = e.ID_Departamento_Origen
			INNER JOIN Departamentos dep_destino ON dep_destino.ID_DEPARTAMENTOS = e.ID_Departamento_Destino
			 ${filtro}
			 ORDER BY e.Fecha_Creacion DESC`,
			params
		);

		return res.status(200).json({ success: true, envios });
	} catch (error) {
		return res.status(500).json({ msg: 'No se pudo cargar el historial de paquetería', error: error.message });
	}
};

export { obtenerCatalogosEnvio, crearEnvioPaqueteria, obtenerEnviosPaqueteria };

