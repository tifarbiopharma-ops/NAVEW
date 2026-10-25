import pool from '../database.js';
import crypto from 'node:crypto';
import { registrarReporteAcceso } from '../utils/reportesAccesos.js';
import { obtenerColaboradoresACargo } from '../utils/organigrama/index.js';
import { descartarOtrasAprobaciones, resolverAprobadoresSolicitud } from '../utils/verificarAprobadorSolicitud.js';
import { ROLES_SUPERIORES } from '../middlewares/roles.js';

const ROLES_SOLICITUD = new Set(['solicitante', 'jefe', 'administrador', 'subgerentegeneral', 'gerentegeneral', 'presidente', 'subgerente', 'gerente']);
//colaborador 

const obtenerCatalogosAcceso = async (req, res) => {
  const idColaborador = Number(req.user?.idColaborador);

  if (!Number.isSafeInteger(idColaborador) || idColaborador <= 0) {
    return res.status(403).json({
      success: false,
      msg: 'Tu usuario no tiene un colaborador asociado',
    });
  }

  try {
    const [[plantas], [areas], [colaboradores], [perfilRows]] =
      await Promise.all([
        pool.query(`
          SELECT
            ID_UBICACIONES AS id,
            DESCRIPCION AS nombre
          FROM Ubicaciones
          ORDER BY DESCRIPCION ASC
        `),

        pool.query(`
          SELECT
            ID_AREAS AS id,
            AREA AS nombre
          FROM Areas
          ORDER BY AREA
        `),

        pool.query(`
          SELECT
            c.ID_COLABORADOR AS id,
            c.NOMBRE AS nombre,
            a.ID_AREAS AS areaId,
            a.AREA AS areaNombre,
            c.UBICACION AS plantaId
          FROM Colaboradores c
          LEFT JOIN Cargos ca
            ON ca.ID_CARGOS = c.CARGO
          LEFT JOIN Areas a
            ON a.ID_AREAS = ca.AREA
          WHERE c.ESTADO = 'ACTIVO'
          ORDER BY c.NOMBRE
        `),

        pool.query(`
          SELECT
            c.ID_COLABORADOR AS id,
            a.ID_AREAS AS areaId,
            a.AREA AS areaNombre,
            c.UBICACION AS plantaId,
            u.DESCRIPCION AS plantaNombre
          FROM Colaboradores c
          LEFT JOIN Cargos ca
            ON ca.ID_CARGOS = c.CARGO
          LEFT JOIN Areas a
            ON a.ID_AREAS = ca.AREA
          LEFT JOIN Ubicaciones u
            ON u.ID_UBICACIONES = c.UBICACION
          WHERE c.ID_COLABORADOR = ?
        `, [idColaborador]),
      ]);

    return res.status(200).json({
      success: true,
      plantas,
      areas,
      colaboradores,
      perfilSolicitante: perfilRows[0] || null,
    });

  } catch (error) {
    console.error('Error al obtener catálogos de acceso:', error);

    return res.status(500).json({
      success: false,
      msg: 'No se pudieron cargar los catálogos de acceso',
    });
  }
};
;

const crearAccesoExterno = async (req, res) => {
	const idColaborador = req.user?.idColaborador;
	if (!idColaborador) {
		return res.status(403).json({ msg: 'Tu usuario no tiene un colaborador asociado' });
	}

	
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
			numero_acompanantes = 0,
			acompanantes = [],
		} = req.body;

		if ([empresa, nombre_apellido, cedula, telefono, id_empleado_visitado, area_visita, id_planta_destino, fecha_visita].some((value) => !value)) {
			return res.status(400).json({ msg: 'Completa todos los campos obligatorios de la visita' });
		}
		if (!Number.isInteger(Number(numero_acompanantes)) || Number(numero_acompanantes) < 0 || Number(numero_acompanantes) > 20) {
			return res.status(400).json({ msg: 'El número de acompañantes debe estar entre 0 y 20' });
		}
		if (!Array.isArray(acompanantes) || acompanantes.length !== Number(numero_acompanantes)) {
			return res.status(400).json({ msg: 'Completa los datos de todos los acompañantes' });
		}
		const cedulas = [cedula.trim(), ...acompanantes.map((item) => String(item?.cedula || '').trim())];
		if (acompanantes.some((item) => !String(item?.nombre_apellido || '').trim() || !String(item?.cedula || '').trim())) {
			return res.status(400).json({ msg: 'El nombre y la cédula de cada acompañante son obligatorios' });
		}
		if (new Set(cedulas).size !== cedulas.length) {
			return res.status(400).json({ msg: 'No se pueden repetir las cédulas de los visitantes' });
		}

		await connection.beginTransaction();

		const idUbicacionDestino = Number(id_planta_destino);

		if (!Number.isSafeInteger(idUbicacionDestino) || idUbicacionDestino <= 0) {
		await connection.rollback();

		return res.status(400).json({
			msg: 'La ubicación de destino no es válida',
		});
		}

		const [ubicaciones] = await connection.query(
		`SELECT ID_UBICACIONES
		FROM Ubicaciones
		WHERE ID_UBICACIONES = ?`,
		[idUbicacionDestino]
		);

		if (!ubicaciones.length) {
		await connection.rollback();

		return res.status(400).json({
			msg: 'La ubicación de destino no existe',
		});
}

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
		const idAprobadores = await resolverAprobadoresSolicitud(req.user.idColaborador);

		await connection.query(
		`INSERT INTO Accesos_Externos
		(
			ID_Acceso,
			ID_Externo,
			Numero_Acompanantes,
			ID_Empleado_Visitado,
			Area_Visita,
			ID_Ubicacion_Destino,
			Fecha_Visita,
			Hora_Ingreso,
			Hora_Salida,
			Motivo,
			Estado_Actual
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Solicitado')`,
		[
			idAcceso,
			idExterno,
			Number(numero_acompanantes),
			idColaborador,
			area_visita.trim(),
			idUbicacionDestino,
			fecha_visita,
			hora_ingreso || null,
			hora_salida || null,
			motivo?.trim() || null
		]
		);

		for (const acompanante of acompanantes) {
		const nombreAcompanante = String(acompanante.nombre_apellido).trim();
		const cedulaAcompanante = String(acompanante.cedula).trim();
		const [existente] = await connection.query(
			'SELECT ID_Externo FROM Externos WHERE Cedula = ?',
			[cedulaAcompanante]
		);
		const idAcompanante = existente[0]?.ID_Externo || crypto.randomUUID();
		if (existente.length) {
			await connection.query(
				`UPDATE Externos SET Nombre_Apellido = ?, Telefono = ?, Empresa = ?, Es_Acompanante = 1
				 WHERE ID_Externo = ?`,
				[nombreAcompanante, telefono.trim(), empresa.trim(), idAcompanante]
			);
		} else {
			await connection.query(
				`INSERT INTO Externos (ID_Externo, Nombre_Apellido, Cedula, Telefono, Empresa, Es_Acompanante)
				 VALUES (?, ?, ?, ?, ?, 1)`,
				[idAcompanante, nombreAcompanante, cedulaAcompanante, telefono.trim(), empresa.trim()]
			);
		}
		await connection.query(
			'INSERT INTO Accesos_Externos_Acompanantes (ID_Acceso, ID_Externo) VALUES (?, ?)',
			[idAcceso, idAcompanante]
		);
		}

		await connection.query(
			`INSERT INTO Eventos_Process_Mining
			 (ID_Transaccion, Tipo_Modulo, Fase_Estado, ID_Usuario_Actor, Detalles_Extra)
			 VALUES (?, 'EXTERNO', 'Solicitado', ?, ?)`,
			 [idAcceso, req.user.idColaborador, JSON.stringify({ empresa: empresa.trim(), visitante: nombre_apellido.trim(), acompanantes: Number(numero_acompanantes) })]
		);

		// Una aprobación pendiente por cada jefe; la resuelve el primero que responda.
		await connection.query(
			`INSERT INTO Aprobaciones
			 (TIPO_SOLICITUD, ID_SOLICITUD, NIVEL_APROBACION, ID_APROBADOR, ESTADO)
			 VALUES ?`,
			[idAprobadores.map((idAprobador) => ['EXTERNO', idAcceso, 1, idAprobador, 'PENDIENTE'])]
		);

		await connection.commit();
		// La auditoria utiliza usuarios.id, no ID_COLABORADOR.
		await registrarReporteAcceso({
			usuarioId: req.user.id,
			usuarioNombre: req.user.nombre,
			accion: 'CREAR_ACCESO',
			idAcceso,
			estadoAnterior: null,
			estadoNuevo: 'Solicitado',
			detalles: { numero_acompanantes: Number(numero_acompanantes) },
		});
		return res.status(201).json({ success: true, msg: 'Solicitud de acceso externo creada', idAcceso });
	} catch (error) {
		try { await connection.rollback(); } catch (rollbackError) { console.error('Error en rollback:', rollbackError); }
		return res.status(500).json({ msg: 'No se pudo crear la solicitud de acceso externo' });
	} finally {
		connection.release();
	}
};


const obtenerAccesosExternos = async (req, res) => {
  const idColaborador = Number(req.user?.idColaborador);

  if (!Number.isSafeInteger(idColaborador) || idColaborador <= 0) {
    return res.status(403).json({
      msg: 'Tu usuario no tiene un colaborador asociado'
    });
  }

  try {
    const rol = (req.user?.rol || '').toLowerCase();
    const params = [idColaborador];
	let filtro = '';

    if (ROLES_SUPERIORES.includes(rol)) {
      const idsSubordinados = await obtenerColaboradoresACargo(idColaborador);

      const idsPermitidos = [
        ...new Set([...idsSubordinados, idColaborador])
      ];

      filtro = `
        WHERE a.ID_Empleado_Visitado IN (
          ${idsPermitidos.map(() => '?').join(', ')}
        )
      `;

      params.push(...idsPermitidos);

    } else if (!['administrador', 'supervisor'].includes(rol)) {
      filtro = 'WHERE a.ID_Empleado_Visitado = ?';
      params.push(idColaborador);
    }

    const [accesos] = await pool.query(
      `SELECT
        a.ID_Acceso,
        a.ID_Externo,
        ext.Nombre_Apellido AS externo_nombre,
        ext.Empresa AS externo_empresa,
        ext.Cedula AS externo_cedula,
        ext.Telefono AS externo_telefono,

        a.ID_Empleado_Visitado,
        a.ID_Empleado_Visitado AS ID_Solicitante,
        col.NOMBRE AS solicitante_nombre,
        col.NOMBRE AS empleado_nombre,

        EXISTS (
          SELECT 1
          FROM Aprobaciones ap
          WHERE ap.TIPO_SOLICITUD = 'EXTERNO'
            AND ap.ID_SOLICITUD = a.ID_Acceso
            AND ap.ID_APROBADOR = ?
            AND ap.ESTADO = 'PENDIENTE'
            AND a.Estado_Actual = 'Solicitado'
        ) AS puedeAprobar,

        a.Numero_Acompanantes,
        a.Area_Visita,
        a.ID_Ubicacion_Destino AS ID_Planta_Destino,
        p.DESCRIPCION AS planta_destino_nombre,
        a.Fecha_Visita,
        a.Hora_Ingreso,
        a.Hora_Salida,
        a.Motivo,
        a.Estado_Actual,
        a.QR_Token,
        a.QR_Salida,
        a.QR_Entrada

      FROM Accesos_Externos a

      INNER JOIN Externos ext
        ON ext.ID_Externo = a.ID_Externo

      INNER JOIN Colaboradores col
        ON col.ID_COLABORADOR = a.ID_Empleado_Visitado

      INNER JOIN Ubicaciones p
        ON p.ID_UBICACIONES = a.ID_Ubicacion_Destino

      ${filtro}

      ORDER BY a.Fecha_Creacion DESC`,
      params
    );

    const idsAcceso = accesos.map(
      (acceso) => acceso.ID_Acceso
    );

    if (idsAcceso.length) {
      const [acompanantes] = await pool.query(
        `SELECT
          r.ID_Acceso,
          e.ID_Externo,
          e.Nombre_Apellido AS nombre,
          e.Cedula AS cedula

        FROM Accesos_Externos_Acompanantes r

        INNER JOIN Externos e
          ON e.ID_Externo = r.ID_Externo

        WHERE r.ID_Acceso IN (
          ${idsAcceso.map(() => '?').join(', ')}
        )`,
        idsAcceso
      );

      const acompanantesPorAcceso = acompanantes.reduce(
        (resultado, acompanante) => {
          if (!resultado[acompanante.ID_Acceso]) {
            resultado[acompanante.ID_Acceso] = [];
          }

          resultado[acompanante.ID_Acceso].push(acompanante);
          return resultado;
        },
        {}
      );

      accesos.forEach((acceso) => {
        acceso.acompanantes =
          acompanantesPorAcceso[acceso.ID_Acceso] || [];

        acceso.puedeAprobar = Boolean(acceso.puedeAprobar);
      });
    }

    return res.status(200).json({
      success: true,
      accesos
    });

  } catch (error) {
    console.error('Error en obtenerAccesosExternos:', error);

    return res.status(500).json({
      msg: 'No se pudo cargar el proceso de accesos externos'
    });
  }
};


const aprobarAccesoExterno = async (req, res) => {
	const idColaborador = req.user?.idColaborador;
	if (!idColaborador) {
		return res.status(403).json({ msg: 'Tu usuario no tiene un colaborador asociado' });
	}

	
	const connection = await pool.getConnection();

	try {
		const rol = (req.user?.rol || '').toLowerCase();
		if (!['jefe', 'administrador', 'subgerentegeneral', 'gerentegeneral', 'presidente', 'subgerente', 'gerente'].includes(rol)) {
			return res.status(403).json({ msg: 'No tienes permiso para aprobar esta solicitud' });
		}

		const { id } = req.params;
		const { accion } = req.body;
		if (!['Aprobado', 'Rechazado'].includes(accion)) {
			return res.status(400).json({ msg: 'Acción de aprobación inválida' });
		}
		const aprobado = accion === 'Aprobado';
		const estado = aprobado ? 'Aprobado' : 'RECHAZADO';
		const estadoAprobacion = estado;

		await connection.beginTransaction();
		const [accesoRows] = await connection.query(
			'SELECT Numero_Acompanantes, Estado_Actual, ID_Empleado_Visitado AS ID_Solicitante FROM Accesos_Externos WHERE ID_Acceso = ? FOR UPDATE',
			[id]
		);
		if (!accesoRows.length) {
			await connection.rollback();
			return res.status(404).json({ msg: 'La solicitud de acceso externo no existe' });
		}
		const numeroAcompanantes = Number(accesoRows[0].Numero_Acompanantes || 0);
		const estadoAnterior = accesoRows[0].Estado_Actual;
		if (estadoAnterior !== 'Solicitado') {
			await connection.rollback();
			return res.status(409).json({ msg: 'La solicitud ya fue procesada' });
		}
		// Sin creador identificado no es seguro autorizar solicitudes antiguas.
        const idSolicitante = accesoRows[0].ID_Solicitante;
        if (!idSolicitante) {
            await connection.rollback();
            return res.status(409).json({ msg: 'Esta solicitud antigua no tiene solicitante identificado. Requiere regularización.' });
        }

        const [aprobaciones] = await connection.query(
            `SELECT ID_APROBACION FROM Aprobaciones
             WHERE TIPO_SOLICITUD = 'EXTERNO'
               AND ID_SOLICITUD = ?
               AND ID_APROBADOR = ?
               AND ESTADO = 'PENDIENTE'
             FOR UPDATE`,
            [id, idColaborador]
        );
        if (!aprobaciones.length) {
            await connection.rollback();
            return res.status(403).json({ msg: 'No eres el aprobador asignado a esta solicitud' });
        }
        if (Number(idSolicitante) === Number(idColaborador)) {
            const autorizados = await resolverAprobadoresSolicitud(idColaborador);
            if (!autorizados.includes(Number(idColaborador))) {
                await connection.rollback();
                return res.status(403).json({ msg: 'Tu superior debe aprobar esta solicitud' });
            }
        }

		const qrToken = aprobado ? `EXTERNO|${id}|ACOMPANANTES:${numeroAcompanantes}|${crypto.randomUUID()}` : null;
		await connection.query(
			`UPDATE Aprobaciones
			 SET ESTADO = ?, FECHA_RESPUESTA = NOW()
			 WHERE ID_APROBACION = ?`,
			[estadoAprobacion, aprobaciones[0].ID_APROBACION]
		);
		const otrosAprobadores = await descartarOtrasAprobaciones(
			connection, 'EXTERNO', id, aprobaciones[0].ID_APROBACION
		);

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
			[id, estado, req.user.idColaborador, JSON.stringify({
				accion: estado,
				numero_acompanantes: numeroAcompanantes,
			})]
		);

		await connection.commit();
		// Registrar el cambio de estado sin guardar el token QR.
		await registrarReporteAcceso({
			usuarioId: req.user.id,
			usuarioNombre: req.user.nombre,
			accion: aprobado ? 'APROBAR_ACCESO' : 'RECHAZAR_ACCESO',
			idAcceso: id,
			estadoAnterior,
			estadoNuevo: estado,
			detalles: { numero_acompanantes: numeroAcompanantes, otros_aprobadores: otrosAprobadores },
		});
		return res.json({ success: true, estado, qrToken });
	} catch (error) {
		await connection.rollback();
		return res.status(500).json({ msg: 'No se pudo procesar la aprobación' });
	} finally {
		connection.release();
	}
};

export { obtenerCatalogosAcceso, crearAccesoExterno, obtenerAccesosExternos, aprobarAccesoExterno };