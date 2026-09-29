import pool from '../database.js';
import crypto from 'node:crypto';

const ROLES_SOLICITUD = new Set(['solicitante', 'jefe', 'administrador']);

const obtenerCatalogosAcceso = async (req, res) => {
	try {
		const [plantas] = await pool.query(
			'SELECT ID_Planta AS id, Nombre_Planta AS nombre FROM Plantas ORDER BY Nombre_Planta'
		);
		const [colaboradores] = await pool.query(
			`SELECT ID_COLABORADOR AS id, NOMBRE AS nombre
			 FROM Colaboradores
			 WHERE ESTADO = 'ACTIVO'
			 ORDER BY NOMBRE`
		);

		return res.status(200).json({ success: true, plantas, colaboradores });
	} catch (error) {
		return res.status(500).json({ msg: 'No se pudieron cargar los catálogos de acceso', error: error.message });
	}
};

const crearAccesoExterno = async (req, res) => {
	const connection = await pool.getConnection();

	try {
		const rol = (req.user?.rol || '').toLowerCase();
		if (!ROLES_SOLICITUD.has(rol)) {
			return res.status(403).json({ msg: 'No tienes permiso para crear solicitudes de acceso externo' });
		}

		const {
			empresa,
			nombre_apellido,
			cedula,
			telefono,
			id_empleado_visitado,
			area_visita,
			id_planta_destino,
			fecha_visita,
			hora_ingreso,
			hora_salida,
			motivo,
		} = req.body;

		if ([empresa, nombre_apellido, cedula, telefono, id_empleado_visitado, area_visita, id_planta_destino, fecha_visita].some((value) => !value)) {
			return res.status(400).json({ msg: 'Completa todos los campos obligatorios de la visita' });
		}

		await connection.beginTransaction();

		const [empleado] = await connection.query(
			`SELECT ID_COLABORADOR FROM Colaboradores
			 WHERE ID_COLABORADOR = ? AND ESTADO = 'ACTIVO'`,
			[id_empleado_visitado]
		);
		if (!empleado.length) {
			await connection.rollback();
			return res.status(400).json({ msg: 'La persona visitada no es un colaborador activo' });
		}

		const [externoExistente] = await connection.query(
			'SELECT ID_Externo FROM Externos WHERE Cedula = ?',
			[cedula.trim()]
		);
		const idExterno = externoExistente[0]?.ID_Externo || crypto.randomUUID();

		if (externoExistente.length) {
			await connection.query(
				`UPDATE Externos
				 SET Nombre_Apellido = ?, Telefono = ?, Empresa = ?
				 WHERE ID_Externo = ?`,
				[nombre_apellido.trim(), telefono.trim(), empresa.trim(), idExterno]
			);
		} else {
			await connection.query(
				`INSERT INTO Externos (ID_Externo, Nombre_Apellido, Cedula, Telefono, Empresa)
				 VALUES (?, ?, ?, ?, ?)`,
				[idExterno, nombre_apellido.trim(), cedula.trim(), telefono.trim(), empresa.trim()]
			);
		}

		const idAcceso = crypto.randomUUID();
		await connection.query(
			`INSERT INTO Accesos_Externos
			 (ID_Acceso, ID_Externo, ID_Empleado_Visitado, Area_Visita, ID_Planta_Destino,
			  Fecha_Visita, Hora_Ingreso, Hora_Salida, Motivo, Estado_Actual)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SOLICITADO')`,
			[idAcceso, idExterno, id_empleado_visitado, area_visita.trim(), id_planta_destino, fecha_visita, hora_ingreso || null, hora_salida || null, motivo?.trim() || null]
		);

		await connection.query(
			`INSERT INTO Eventos_Process_Mining
			 (ID_Transaccion, Tipo_Modulo, Fase_Estado, ID_Usuario_Actor, Detalles_Extra)
			 VALUES (?, 'EXTERNO', 'SOLICITADO', ?, ?)`,
			[idAcceso, req.user.id, JSON.stringify({ empresa: empresa.trim(), visitante: nombre_apellido.trim() })]
		);

		await connection.commit();
		return res.status(201).json({ success: true, msg: 'Solicitud de acceso externo creada', idAcceso });
	} catch (error) {
		await connection.rollback();
		return res.status(500).json({ msg: 'No se pudo crear la solicitud de acceso externo', error: error.message });
	} finally {
		connection.release();
	}
};

const obtenerAccesosExternos = async (req, res) => {
	try {
		const rol = (req.user?.rol || '').toLowerCase();
		const params = [];
		let filtro = '';

		if (!['administrador', 'supervisor'].includes(rol)) {
			filtro = 'WHERE a.ID_Empleado_Visitado = ?';
			params.push(req.user.id);
		}

		const [accesos] = await pool.query(
			`SELECT a.ID_Acceso, a.ID_Externo, ext.Nombre_Apellido AS externo_nombre,
							a.ID_Empleado_Visitado, col.NOMBRE AS empleado_nombre,
							a.Area_Visita, a.ID_Planta_Destino, p.Nombre_Planta AS planta_destino_nombre,
							a.Fecha_Visita, a.Hora_Ingreso, a.Hora_Salida, a.Motivo, a.Estado_Actual
			 FROM Accesos_Externos a
			 INNER JOIN Externos ext ON ext.ID_Externo = a.ID_Externo
			 INNER JOIN Colaboradores col ON col.ID_COLABORADOR = a.ID_Empleado_Visitado
			 INNER JOIN Plantas p ON p.ID_Planta = a.ID_Planta_Destino
			 ${filtro}
			 ORDER BY a.Fecha_Creacion DESC`,
			params
		);

		return res.status(200).json({ success: true, accesos });
	} catch (error) {
		return res.status(500).json({ msg: 'No se pudo cargar el proceso de accesos externos', error: error.message });
	}
};

export { obtenerCatalogosAcceso, crearAccesoExterno, obtenerAccesosExternos };
