import pool from '../database.js';
import crypto from 'node:crypto';
import { obtenerColaboradoresACargo, obtenerJefeDirecto } from '../utils/jerarquia.js';

const ROLES_SOLICITUD = new Set(['solicitante', 'jefe', 'administrador']);
//colaborador 
const obtenerCatalogosAcceso = async (req, res) => {
	try {
		const [plantas] = await pool.query(
			'SELECT ID_Planta AS id, Nombre_Planta AS nombre FROM Plantas ORDER BY Nombre_Planta'
		);
		const [areas] = await pool.query(
			'SELECT ID_AREAS AS id, AREA AS nombre FROM Areas ORDER BY AREA'
		);
		const [colaboradores] = await pool.query(
			`SELECT c.ID_COLABORADOR AS id, c.NOMBRE AS nombre,
					c.AREA AS areaId, a.AREA AS areaNombre
			 FROM Colaboradores c
			 LEFT JOIN Areas a ON a.ID_AREAS = c.AREA
			 WHERE c.ESTADO = 'ACTIVO'
			 ORDER BY c.NOMBRE`
		);
		const [perfilRows] = await pool.query(
			`SELECT c.ID_COLABORADOR AS id,
					c.AREA AS areaId,
					a.AREA AS areaNombre,
					p.ID_Planta AS plantaId,
					p.Nombre_Planta AS plantaNombre
			 FROM Colaboradores c
			 LEFT JOIN Areas a ON a.ID_AREAS = c.AREA
			 LEFT JOIN Ubicaciones u ON u.ID_UBICACIONES = c.UBICACION
			 LEFT JOIN Plantas p ON p.ID_Planta = (
				 SELECT p2.ID_Planta
				 FROM Plantas p2
				 WHERE p2.Nombre_Planta = u.DESCRIPCION
					OR p2.Ubicacion_Fisica = u.DESCRIPCION
				 LIMIT 1
			 )
			 WHERE c.ID_COLABORADOR = ?`,
			[req.user.id]
		);

		return res.status(200).json({
			success: true,
			plantas,
			areas,
			colaboradores,
			perfilSolicitante: perfilRows[0] || null,
		});
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
		const idAprobador = await obtenerJefeDirecto(req.user.id);
		if (!idAprobador) {
			await connection.rollback();
			return res.status(400).json({ msg: 'No se encontró un jefe para aprobar esta solicitud' });
		}

		await connection.query(
			`INSERT INTO Accesos_Externos
			 (ID_Acceso, ID_Externo, ID_Empleado_Visitado, Area_Visita, ID_Planta_Destino,
			  Fecha_Visita, Hora_Ingreso, Hora_Salida, Motivo, Estado_Actual)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Solicitado')`,
			[idAcceso, idExterno, id_empleado_visitado, area_visita.trim(), id_planta_destino, fecha_visita, hora_ingreso || null, hora_salida || null, motivo?.trim() || null]
		);

		await connection.query(
			`INSERT INTO Eventos_Process_Mining
			 (ID_Transaccion, Tipo_Modulo, Fase_Estado, ID_Usuario_Actor, Detalles_Extra)
			 VALUES (?, 'EXTERNO', 'Solicitado', ?, ?)`,
			[idAcceso, req.user.id, JSON.stringify({ empresa: empresa.trim(), visitante: nombre_apellido.trim() })]
		);

		await connection.query(
			`INSERT INTO Aprobaciones
			 (TIPO_SOLICITUD, ID_SOLICITUD, NIVEL_APROBACION, ID_APROBADOR, ESTADO)
			 VALUES ('EXTERNO', ?, 1, ?, 'PENDIENTE')`,
			[idAcceso, idAprobador]
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

		if (rol === 'jefe') {
			const idsSubordinados = await obtenerColaboradoresACargo(req.user.id);
			idsSubordinados.push(req.user.id);

			if (!idsSubordinados.length) {
				filtro = 'WHERE 1 = 0';
			} else {
				filtro = `WHERE a.ID_Empleado_Visitado IN (${idsSubordinados.map(() => '?').join(', ')})
					AND a.Estado_Actual = 'Solicitado'`;
				params.push(...idsSubordinados);
			}
		} else if (!['administrador', 'supervisor'].includes(rol)) {
			filtro = 'WHERE a.ID_Empleado_Visitado = ?';
			params.push(req.user.id);
		}

		const [accesos] = await pool.query(
			`SELECT a.ID_Acceso, a.ID_Externo, ext.Nombre_Apellido AS externo_nombre,
							ext.Empresa AS externo_empresa,
							ext.Cedula AS externo_cedula, ext.Telefono AS externo_telefono,
							a.ID_Empleado_Visitado, col.NOMBRE AS empleado_nombre,
							a.Area_Visita, a.ID_Planta_Destino, p.Nombre_Planta AS planta_destino_nombre,
							a.Fecha_Visita, a.Hora_Ingreso, a.Hora_Salida, a.Motivo, a.Estado_Actual, a.QR_Token
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

const aprobarAccesoExterno = async (req, res) => {
	const connection = await pool.getConnection();

	try {
		const rol = (req.user?.rol || '').toLowerCase();
		if (!['jefe', 'administrador'].includes(rol)) {
			return res.status(403).json({ msg: 'No tienes permiso para aprobar esta solicitud' });
		}

		const { id } = req.params;
		const { accion } = req.body;
		const aprobado = accion === 'Aprobado';
		const estado = aprobado ? 'Aprobado' : 'RECHAZADO';
		const estadoAprobacion = estado;

		await connection.beginTransaction();
		const [aprobaciones] = await connection.query(
			`SELECT ID_APROBACION FROM Aprobaciones
			 WHERE TIPO_SOLICITUD = 'EXTERNO'
			   AND ID_SOLICITUD = ?
			   AND ID_APROBADOR = ?
			   AND ESTADO = 'PENDIENTE'`,
			[id, req.user.id]
		);

		if (!aprobaciones.length && rol !== 'administrador') {
			const idsSubordinados = await obtenerColaboradoresACargo(req.user.id);
			idsSubordinados.push(req.user.id);
			const [accesosPermitidos] = await connection.query(
				`SELECT ID_Acceso FROM Accesos_Externos
				 WHERE ID_Acceso = ?
				   AND ID_Empleado_Visitado IN (${idsSubordinados.map(() => '?').join(', ')})
				   AND Estado_Actual = 'Solicitado'`,
				[id, ...idsSubordinados]
			);

			if (!accesosPermitidos.length) {
				await connection.rollback();
				return res.status(403).json({ msg: 'No tienes permiso para aprobar esta solicitud' });
			}
		}

		const qrToken = aprobado ? `EXTERNO|${id}|${crypto.randomUUID()}` : null;
		if (aprobaciones.length) {
			await connection.query(
				`UPDATE Aprobaciones
				 SET ESTADO = ?, FECHA_RESPUESTA = NOW()
				 WHERE ID_APROBACION = ?`,
				[estadoAprobacion, aprobaciones[0].ID_APROBACION]
			);
		}

		await connection.query(
			`UPDATE Accesos_Externos
			 SET Estado_Actual = ?, QR_Token = ?
			 WHERE ID_Acceso = ?`,
			[estado, qrToken, id]
		);

		await connection.query(
			`INSERT INTO Eventos_Process_Mining
			 (ID_Transaccion, Tipo_Modulo, Fase_Estado, ID_Usuario_Actor, Detalles_Extra)
			 VALUES (?, 'EXTERNO', ?, ?, ?)`,
			[id, estado, req.user.id, JSON.stringify({ accion: estado })]
		);

		await connection.commit();
		return res.json({ success: true, estado, qrToken });
	} catch (error) {
		await connection.rollback();
		return res.status(500).json({ msg: 'No se pudo procesar la aprobación', error: error.message });
	} finally {
		connection.release();
	}
};

export { obtenerCatalogosAcceso, crearAccesoExterno, obtenerAccesosExternos, aprobarAccesoExterno };
