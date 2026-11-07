
import pool from '../database.js';
import crypto from 'node:crypto';
import { obtenerColaboradoresACargo } from '../utils/organigrama/index.js';
import { ErrorNegocio, responderError } from '../utils/errores.js';
import { registrarReporteTraslado } from '../utils/reportesTraslados.js';
import {
  descartarOtrasAprobaciones,
  resolverAprobadoresSolicitud,
} from '../utils/verificarAprobadorSolicitud.js';
import { ROLES_GARITA, ROLES_SUPERIORES, registrarIntentoDenegado } from '../middlewares/roles.js';
import {
  SEGUNDOS_ENLACE_TEMPORAL,
  extensionPorTipo,
  validarArchivo,
  subirArchivo,
  eliminarArchivo,
  enlaceTemporal,
} from '../utils/minioStorage.js';

// ==========================================
// 1. HELPERS INTERNOS
// ==========================================

const obtenerDatosTraslado = async (connection, idTraslado) => {
  const [rows] = await connection.query(
    `SELECT
       t.ID_Traslado,
       t.Tipo_Traslado,
       t.Fecha_Salida,
       t.Hora_Salida,
       t.Motivo_Viaje,
       t.Observaciones,
       t.Km_Inicial,
       t.Monto_Solicitado,
       t.Estado_Actual,
       solicitante.NOMBRE AS solicitante,
       chofer.NOMBRE AS chofer,
       origen.DESCRIPCION AS planta_origen,
       destino.DESCRIPCION AS planta_destino
     FROM Traslados_Personal t
     LEFT JOIN Colaboradores solicitante
       ON solicitante.ID_COLABORADOR = t.ID_Solicitante
     LEFT JOIN Colaboradores chofer
       ON chofer.ID_COLABORADOR = t.ID_Chofer
     LEFT JOIN Ubicaciones origen
       ON origen.ID_UBICACIONES = t.ID_Ubicacion_Origen
     LEFT JOIN Ubicaciones destino
       ON destino.ID_UBICACIONES = t.ID_Ubicacion_Destino
     WHERE t.ID_Traslado = ?`,
    [idTraslado]
  );

  return rows[0] || null;
};

const datosCreacion = (traslado) => ({
  solicitante: traslado.solicitante,
  fecha_salida: traslado.Fecha_Salida,
  hora_salida: traslado.Hora_Salida,
  planta_origen: traslado.planta_origen,
  planta_destino: traslado.planta_destino,
  motivo_viaje: traslado.Motivo_Viaje,
  observaciones: traslado.Observaciones,
});

const setupTraslado = async (
  req,
  res,
  connection,
  tipoTraslado,
  extraFields,
  extraValues
) => {
  const idSolicitante = req.user.idColaborador;

  if (!idSolicitante) {
    throw new ErrorNegocio('Tu usuario no tiene un colaborador asociado', 403);
  }

  const {
    fecha_salida,
    hora_salida,
    motivo_viaje,
    observaciones,
    id_planta_origen,
    id_planta_destino,
  } = req.body;

  if (
    !fecha_salida ||
    !hora_salida ||
    !id_planta_origen ||
    !id_planta_destino
  ) {
    throw new ErrorNegocio('Faltan campos obligatorios para el traslado', 400);
  }

  const idAprobadores = await resolverAprobadoresSolicitud(idSolicitante);

  const idTraslado = crypto.randomUUID();

  const campos = [
    'ID_Traslado',
    'Tipo_Traslado',
    'Fecha_Salida',
    'Hora_Salida',
    'Motivo_Viaje',
    'Observaciones',
    'Estado_Actual',
    'ID_Solicitante',
    'ID_Ubicacion_Origen',
    'ID_Ubicacion_Destino',
    ...extraFields,
  ];

  const placeholders = campos.map(() => '?').join(', ');

  await connection.query(
    `INSERT INTO Traslados_Personal
     (${campos.join(', ')})
     VALUES (${placeholders})`,
    [
      idTraslado,
      tipoTraslado,
      fecha_salida,
      hora_salida,
      motivo_viaje,
      observaciones || null,
      'Solicitado',
      idSolicitante,
      id_planta_origen,
      id_planta_destino,
      ...extraValues,
    ]
  );

  // Una aprobación pendiente por cada jefe; la resuelve el primero que responda.
  await connection.query(
    `INSERT INTO Aprobaciones
     (
       TIPO_SOLICITUD,
       ID_SOLICITUD,
       NIVEL_APROBACION,
       ID_APROBADOR,
       ESTADO
     )
     VALUES ?`,
    [idAprobadores.map((idAprobador) => ['TRASLADO', idTraslado, 1, idAprobador, 'PENDIENTE'])]
  );

  return { idTraslado, idAprobadores };
};

// ==========================================
// 2. CATÁLOGOS
// ==========================================

const obtenerChoferes = async (req, res) => {
  try {
    const [choferes] = await pool.query(
      `SELECT
         ID_COLABORADOR AS id,
         NOMBRE AS nombre
       FROM Colaboradores
       WHERE ESTADO = 'ACTIVO'
         AND CARGO = 55
       ORDER BY NOMBRE`
    );

    return res.status(200).json({
      success: true,
      choferes,
    });
  } catch (error) {
    return res.status(500).json({
      msg: 'No se pudieron cargar los choferes',
    });
  }
};


const obtenerPlantas = async (req, res) => {
  try {
    const idColaborador = Number(req.user?.idColaborador);

    if (!Number.isSafeInteger(idColaborador) || idColaborador <= 0) {
      return res.status(403).json({
        success: false,
        msg: 'Tu usuario no tiene un colaborador asociado',
      });
    }

    const [[plantas], [colaboradores]] = await Promise.all([
      pool.query(
        `SELECT
           ID_UBICACIONES AS id,
           DESCRIPCION AS nombre
         FROM Ubicaciones
         ORDER BY DESCRIPCION ASC`
      ),

      pool.query(
        `SELECT
           UBICACION AS ubicacionId
         FROM Colaboradores
         WHERE ID_COLABORADOR = ?`,
        [idColaborador]
      ),
    ]);
    return res.status(200).json({
      success: true,
      plantas,
      ubicacionOrigenId: colaboradores[0]?.ubicacionId ?? null,
    });

  } catch (error) {
    console.error('Error al obtener plantas:', error);

    return res.status(500).json({
      success: false,
      msg: 'No se pudieron cargar las plantas',
    });
  }
};


// ==========================================
// 3. TRANSPORTE EMPRESARIAL
// ==========================================

const createTrasladoEmpresarial = async (req, res) => {
  const connection = await pool.getConnection();
  let committed = false;

  try {
    const { id_chofer } = req.body;

    if (!id_chofer) {
      return res.status(400).json({
        msg: 'Falta ID de chofer para transporte empresarial',
      });
    }

    await connection.beginTransaction();

    const result = await setupTraslado(
      req,
      res,
      connection,
      'EMPRESARIAL',
      ['ID_Chofer'],
      [id_chofer]
    );

    if (res.headersSent) { await connection.rollback(); return; }

    const traslado = await obtenerDatosTraslado(
      connection,
      result.idTraslado
    );

    await connection.commit();
    committed = true;

    await registrarReporteTraslado({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      accion: 'CREAR_TRASLADO_EMPRESARIAL',
      idTraslado: result.idTraslado,
      estadoAnterior: null,
      estadoNuevo: 'Solicitado',
      detalles: {
        ...datosCreacion(traslado),
        chofer: traslado.chofer,
      },
    });

    return res.status(201).json({
      success: true,
      msg: 'Transporte Empresarial registrado',
      ...result,
    });
  } catch (error) {
    if (!committed) await connection.rollback();

    return responderError(res, error, 'No se pudo crear el traslado');
  } finally {
    connection.release();
  }
};

// ==========================================
// 4. TRANSPORTE PERSONAL
// ==========================================

const createTrasladoPersonal = async (req, res) => {
  const connection = await pool.getConnection();
  let committed = false;

  try {
    // El KM inicial no viene en la solicitud: lo registra garita al escanear la salida.
    const { monto_solicitado } = req.body;

    await connection.beginTransaction();

    const result = await setupTraslado(
    req,
    res,
    connection,
    'PERSONAL',
    ['Monto_Solicitado'],
    [monto_solicitado ?? null]
  );

if (res.headersSent) { await connection.rollback(); return; }

    const traslado = await obtenerDatosTraslado(
      connection,
      result.idTraslado
    );

    await connection.commit();
    committed = true;

    await registrarReporteTraslado({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      accion: 'CREAR_TRASLADO_PERSONAL',
      idTraslado: result.idTraslado,
      estadoAnterior: null,
      estadoNuevo: 'Solicitado',
      detalles: {
        ...datosCreacion(traslado),
        monto_solicitado: traslado.Monto_Solicitado,
      },
    });

    return res.status(201).json({
      success: true,
      msg: 'Transporte Personal registrado',
      ...result,
    });
  } catch (error) {
    if (!committed) await connection.rollback();

    return responderError(res, error, 'No se pudo crear el traslado');
  } finally {
    connection.release();
  }
};

// ==========================================
// 5. TRANSPORTE PRIVADO
// ==========================================

const createTrasladoPrivado = async (req, res) => {
  const connection = await pool.getConnection();
  let committed = false;

  try {
    const { monto_solicitado } = req.body;

    await connection.beginTransaction();

    const result = await setupTraslado(
      req,
      res,
      connection,
      'PRIVADO',
      ['Monto_Solicitado'],
      [monto_solicitado ?? null]
    );

    if (res.headersSent) { await connection.rollback(); return; }

    const traslado = await obtenerDatosTraslado(
      connection,
      result.idTraslado
    );

    await connection.commit();
    committed = true;

    await registrarReporteTraslado({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      accion: 'CREAR_TRASLADO_PRIVADO',
      idTraslado: result.idTraslado,
      estadoAnterior: null,
      estadoNuevo: 'Solicitado',
      detalles: {
        ...datosCreacion(traslado),
        monto_solicitado: traslado.Monto_Solicitado,
      },
    });

    return res.status(201).json({
      success: true,
      msg: 'Transporte Privado registrado',
      ...result,
    });
  } catch (error) {
    if (!committed) await connection.rollback();

    return responderError(res, error, 'No se pudo crear el traslado');
  } finally {
    connection.release();
  }
};

// ==========================================
// 6. HISTORIAL DE TRASLADOS
// ==========================================


const getTraslados = async (req, res) => {
  try {
    const idUsuario = Number(req.user?.idColaborador);
    const rol = String(req.user?.rol || '').trim().toLowerCase();

    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
      return res.status(403).json({
        msg: 'Tu usuario no tiene un colaborador asociado'
      });
    }

    let query = `
      SELECT
        t.*,
        EXISTS (
          SELECT 1
          FROM Aprobaciones ap
          WHERE ap.TIPO_SOLICITUD = 'TRASLADO'
            AND ap.ID_SOLICITUD = t.ID_Traslado
            AND ap.ID_APROBADOR = ?
            AND ap.ESTADO = 'PENDIENTE'
        ) AS puedeAprobar,

        col.NOMBRE AS Solicitante_Nombre,
        po.DESCRIPCION AS Planta_Origen_Nombre,
        pd.DESCRIPCION AS Planta_Destino_Nombre

      FROM Traslados_Personal t

      LEFT JOIN Colaboradores col
        ON col.ID_COLABORADOR = t.ID_Solicitante

      LEFT JOIN Ubicaciones po
        ON po.ID_UBICACIONES = t.ID_Ubicacion_Origen

      LEFT JOIN Ubicaciones pd
        ON pd.ID_UBICACIONES = t.ID_Ubicacion_Destino
    `;

    const params = [idUsuario];

    if (!['administrador', 'supervisor'].includes(rol)) {

      if (ROLES_SUPERIORES.includes(rol)) {
        const idsSubordinados =
          await obtenerColaboradoresACargo(idUsuario);

        const idsPermitidos = [
          ...new Set([
            ...(idsSubordinados || []),
            idUsuario
          ])
        ];

        query += `
          WHERE (
            t.ID_Solicitante IN (
              ${idsPermitidos.map(() => '?').join(', ')}
            )
            OR EXISTS (
              SELECT 1
              FROM Aprobaciones apv
              WHERE apv.TIPO_SOLICITUD = 'TRASLADO'
                AND apv.ID_SOLICITUD = t.ID_Traslado
                AND apv.ID_APROBADOR = ?
                AND apv.ESTADO = 'PENDIENTE'
            )
          )
        `;

        params.push(...idsPermitidos, idUsuario);

      } else {
        query += ' WHERE t.ID_Solicitante = ?';
        params.push(idUsuario);
      }
    }

    query += ' ORDER BY t.Fecha_Creacion DESC';

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      // La ruta interna de MinIO no sale al navegador: la factura se pide con GET /:id/factura.
      traslados: rows.map(({ Evidencia_Costo, ...traslado }) => ({
        ...traslado,
        tieneFactura: Boolean(Evidencia_Costo),
        puedeAprobar: Boolean(traslado.puedeAprobar)
      }))
    });

  } catch (error) {
    console.error('Error en getTraslados:', error);

    return res.status(500).json({
      msg: 'Error al consultar historial'
    });
  }
};


// ==========================================
// 7. APROBACIÓN Y RECHAZO
// ==========================================

const approveTraslado = async (req, res) => {
  const connection = await pool.getConnection();
  let committed = false;

  try {
    const { id } = req.params;
    const idAprobador = req.user.idColaborador;
    const { accion, comentario } = req.body;

    if (!['Aprobado', 'Rechazado'].includes(accion)) {
      return res.status(400).json({
        msg: 'Acción inválida',
      });
    }

    const dbEstado =
      accion === 'Aprobado' ? 'Aprobado' : 'Rechazado';
    const estadoAprobacion =
      accion === 'Aprobado' ? 'APROBADO' : 'RECHAZADO';

    await connection.beginTransaction();

    const [estadoRows] = await connection.query(
      `SELECT Estado_Actual FROM Traslados_Personal WHERE ID_Traslado = ? FOR UPDATE`,
      [id]
    );
    if (!estadoRows.length) {
      await connection.rollback();
      return res.status(404).json({ msg: 'Traslado no encontrado' });
    }
    if (estadoRows[0].Estado_Actual !== 'Solicitado') {
      await connection.rollback();
      return res.status(409).json({ msg: 'La solicitud ya fue procesada' });
    }

    const [aprobaciones] = await connection.query(
      `SELECT ID_APROBACION
       FROM Aprobaciones
       WHERE TIPO_SOLICITUD = 'TRASLADO'
         AND ID_SOLICITUD = ?
         AND ID_APROBADOR = ?
         AND ESTADO = 'PENDIENTE'`,
      [id, idAprobador]
    );

    if (!aprobaciones.length) {
      await connection.rollback();

      return res.status(403).json({
        msg: 'No tienes permiso para aprobar o ya fue procesada',
      });
    }

    const [[propietario]] = await connection.query(
      'SELECT ID_Solicitante FROM Traslados_Personal WHERE ID_Traslado = ?', [id]
    );
    if (Number(propietario.ID_Solicitante) === Number(idAprobador)) {
      const autorizados = await resolverAprobadoresSolicitud(idAprobador);
      if (!autorizados.includes(Number(idAprobador))) {
        await connection.rollback();
        return res.status(403).json({ msg: 'Tu superior debe aprobar esta solicitud' });
      }
    }

    const traslado = await obtenerDatosTraslado(
      connection,
      id
    );

    if (!traslado) {
      await connection.rollback();

      return res.status(404).json({
        msg: 'Traslado no encontrado',
      });
    }

    const [aprobadores] = await connection.query(
      `SELECT NOMBRE
       FROM Colaboradores
       WHERE ID_COLABORADOR = ?`,
      [idAprobador]
    );

    const nombreAprobador =
      aprobadores[0]?.NOMBRE ||
      req.user.nombre ||
      null;

    await connection.query(
      `UPDATE Aprobaciones
       SET ESTADO = ?,
           COMENTARIO = ?,
           FECHA_RESPUESTA = NOW()
       WHERE ID_APROBACION = ?`,
      [
        estadoAprobacion,
        comentario || null,
        aprobaciones[0].ID_APROBACION,
      ]
    );

    const otrosAprobadores = await descartarOtrasAprobaciones(
      connection, 'TRASLADO', id, aprobaciones[0].ID_APROBACION
    );

    if (dbEstado === 'Aprobado') {
      await connection.query(
        `UPDATE Traslados_Personal
         SET Estado_Actual = ?,
             QR_Token = ?
         WHERE ID_Traslado = ?`,
        [dbEstado, id, id]
      );
    } else {
      await connection.query(
        `UPDATE Traslados_Personal
         SET Estado_Actual = ?
         WHERE ID_Traslado = ?`,
        [dbEstado, id]
      );
    }

    await connection.commit();
    committed = true;

    await registrarReporteTraslado({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      accion: dbEstado === 'Aprobado'
        ? 'APROBAR_TRASLADO'
        : 'RECHAZAR_TRASLADO',
      idTraslado: id,
      estadoAnterior: traslado.Estado_Actual,
      estadoNuevo: dbEstado,
      detalles: {
        aprobador: nombreAprobador,
        solicitante: traslado.solicitante,
        tipo_traslado: traslado.Tipo_Traslado,
        comentario: comentario || null,
        otros_aprobadores: otrosAprobadores,
      },
    });

    return res.status(200).json({
      success: true,
      msg: `Solicitud ${dbEstado.toLowerCase()}`,
      qrToken: dbEstado === 'Aprobado' ? id : null,
    });
  } catch (error) {
    if (!committed) await connection.rollback();

    console.error('Error al procesar aprobación de traslado:', error);

    return res.status(500).json({
      msg: 'Error al procesar la solicitud',
    });
  } finally {
    connection.release();
  }
};

// ==========================================
// 8. FINALIZAR TRASLADO
// ==========================================

// Cierra un traslado PERSONAL con el KM final que registra garita.
// La factura de un traslado PRIVADO se sube con subirFacturaTraslado.
const finalizarTraslado = async (req, res) => {
  const connection = await pool.getConnection();
  let committed = false;

  try {
    const { id } = req.params;
    const { km_final } = req.body;

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT
         Tipo_Traslado,
         Estado_Actual,
         Km_Inicial,
         ID_Solicitante
       FROM Traslados_Personal
       WHERE ID_Traslado = ?
       FOR UPDATE`,
      [id]
    );

    if (!rows.length) {
      await connection.rollback();

      return res.status(404).json({
        msg: 'Traslado no encontrado',
      });
    }

    const traslado = rows[0];

    if (traslado.Tipo_Traslado === 'PRIVADO') {
      await connection.rollback();

      return res.status(400).json({
        msg: 'La factura de un traslado privado se sube desde "Subir factura"',
      });
    }

    if (traslado.Tipo_Traslado !== 'PERSONAL') {
      await connection.rollback();

      return res.status(400).json({
        msg: 'Este tipo de traslado no requiere información adicional',
      });
    }

    // El KM final lo registra garita.
    const rol = String(req.user?.rol || '').toLowerCase();

    if (!ROLES_GARITA.includes(rol)) {
      await connection.rollback();
      await registrarIntentoDenegado(req, 'traslado', id, 'km_final_fuera_de_garita');

      return res.status(403).json({
        msg: 'Solo el personal de garita puede registrar el KM final',
      });
    }

    if (traslado.Estado_Actual !== 'Pendiente KM final') {
      await connection.rollback();

      return res.status(400).json({
        msg: 'El traslado no está pendiente de finalización',
      });
    }

    const kmFinal = Number(km_final);
    const kmInicial = Number(traslado.Km_Inicial);

    if (
      km_final === undefined ||
      km_final === null ||
      km_final === '' ||
      !Number.isFinite(kmFinal) ||
      !Number.isFinite(kmInicial) ||
      kmFinal <= kmInicial
    ) {
      await connection.rollback();

      return res.status(400).json({
        msg: 'El KM final debe ser mayor que el KM inicial',
      });
    }

    await connection.query(
      `UPDATE Traslados_Personal
       SET Km_Final = ?,
           Estado_Actual = 'Finalizado'
       WHERE ID_Traslado = ?`,
      [kmFinal, id]
    );

    const detallesFinalizacion = {
      tipo_traslado: 'PERSONAL',
      km_inicial: kmInicial,
      km_final: kmFinal,
      km_recorridos: kmFinal - kmInicial,
    };

    await connection.commit();
    committed = true;

    await registrarReporteTraslado({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      accion: 'FINALIZAR_TRASLADO',
      idTraslado: id,
      estadoAnterior: traslado.Estado_Actual,
      estadoNuevo: 'Finalizado',
      detalles: detallesFinalizacion,
    });

    return res.status(200).json({
      success: true,
      msg: 'Traslado finalizado correctamente',
    });
  } catch (error) {
    if (!committed) await connection.rollback();

    return res.status(500).json({
      msg: 'No se pudo finalizar el traslado',
    });
  } finally {
    connection.release();
  }
};

// ==========================================
// 9. FACTURA DEL TRASLADO PRIVADO
// ==========================================

// Cada factura vive en la carpeta de su traslado: la ruta dice a quién pertenece.
const rutaFactura = (idTraslado, mimetype) => {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');
  return `facturas/traslados/${idTraslado}/factura-${fecha}${extensionPorTipo[mimetype]}`;
};

/**
 * PUT /api/traslados/:id/factura (multipart, campo "factura")
 * El solicitante adjunta su factura y el traslado queda finalizado en un solo paso.
 * Primero se valida el traslado; el archivo solo se sube a MinIO si todo es correcto,
 * y si la base de datos no se puede actualizar se borra de MinIO para no dejarlo huérfano.
 */
const subirFacturaTraslado = async (req, res) => {
  const errorArchivo = validarArchivo(req.file);
  if (errorArchivo) return res.status(400).json({ msg: errorArchivo });

  const connection = await pool.getConnection();
  let committed = false;
  let objectName = null;

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    // FOR UPDATE: evita que dos subidas simultáneas finalicen el mismo traslado.
    const [rows] = await connection.query(
      `SELECT Tipo_Traslado, Estado_Actual, ID_Solicitante
       FROM Traslados_Personal
       WHERE ID_Traslado = ?
       FOR UPDATE`,
      [id]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ msg: 'Traslado no encontrado' });
    }

    const traslado = rows[0];

    if (traslado.Tipo_Traslado !== 'PRIVADO') {
      await connection.rollback();
      return res.status(400).json({ msg: 'Solo los traslados privados llevan factura' });
    }

    if (Number(traslado.ID_Solicitante) !== Number(req.user?.idColaborador)) {
      await connection.rollback();
      await registrarIntentoDenegado(req, 'traslado', id, 'factura_de_otro_solicitante');
      return res.status(403).json({ msg: 'Solo quien solicitó el traslado puede subir su factura' });
    }

    if (traslado.Estado_Actual !== 'Pendiente factura') {
      await connection.rollback();
      return res.status(400).json({ msg: 'El traslado no está pendiente de factura' });
    }

    objectName = rutaFactura(id, req.file.mimetype);
    const { bucket } = await subirArchivo(objectName, req.file);

    await connection.query(
      `UPDATE Traslados_Personal
       SET Evidencia_Costo = ?,
           Estado_Actual = 'Finalizado'
       WHERE ID_Traslado = ?`,
      [objectName, id]
    );

    await connection.commit();
    committed = true;

    await registrarReporteTraslado({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      accion: 'FINALIZAR_TRASLADO',
      idTraslado: id,
      estadoAnterior: traslado.Estado_Actual,
      estadoNuevo: 'Finalizado',
      detalles: {
        tipo_traslado: 'PRIVADO',
        // Dónde quedó la factura en MinIO; quién y cuándo ya son columnas del reporte.
        bucket,
        factura: objectName,
        nombre_original: req.file.originalname,
        tipo_mime: req.file.mimetype,
        tamanio: req.file.size,
      },
    });

    return res.status(200).json({
      success: true,
      msg: 'Factura subida. El traslado quedó finalizado.',
    });
  } catch (error) {
    if (!committed) {
      await connection.rollback().catch(() => {});
      if (objectName) {
        // La base no guardó la factura: se borra de MinIO para que no quede huérfana.
        await eliminarArchivo(objectName).catch((err) =>
          console.error('No se pudo borrar la factura huérfana', objectName, err?.code || 'ERROR')
        );
      }
    }
    console.error('Error subiendo factura del traslado:', error?.code || error?.message || 'ERROR');
    return res.status(500).json({ msg: 'No se pudo subir la factura' });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/traslados/:id/factura
 * Devuelve un enlace temporal para ver la factura. La pueden ver el solicitante,
 * sus superiores en el organigrama y el administrador.
 */
const verFacturaTraslado = async (req, res) => {
  try {
    const { id } = req.params;
    const idColaborador = Number(req.user?.idColaborador);
    const rol = String(req.user?.rol || '').toLowerCase();

    const [rows] = await pool.query(
      `SELECT Tipo_Traslado, ID_Solicitante, Evidencia_Costo
       FROM Traslados_Personal
       WHERE ID_Traslado = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ msg: 'Traslado no encontrado' });

    const traslado = rows[0];
    const esDueno = Number(traslado.ID_Solicitante) === idColaborador;

    let autorizado = rol === 'administrador' || esDueno;
    if (!autorizado && ROLES_SUPERIORES.includes(rol)) {
      const subordinados = await obtenerColaboradoresACargo(idColaborador);
      autorizado = subordinados.map(Number).includes(Number(traslado.ID_Solicitante));
    }

    if (!autorizado) {
      await registrarIntentoDenegado(req, 'traslado', id, 'ver_factura_sin_permiso');
      return res.status(403).json({ msg: 'No tienes permiso para ver esta factura' });
    }

    // Solo se firman rutas de facturas de MinIO, nunca un valor arbitrario.
    const objectName = String(traslado.Evidencia_Costo || '');
    if (!objectName.startsWith('facturas/')) {
      return res.status(404).json({ msg: 'Este traslado no tiene factura' });
    }

    const extension = objectName.slice(objectName.lastIndexOf('.')).toLowerCase();

    return res.status(200).json({
      success: true,
      url: await enlaceTemporal(objectName),
      esPdf: extension === '.pdf',
      expiraEnSegundos: SEGUNDOS_ENLACE_TEMPORAL,
    });
  } catch (error) {
    console.error('Error obteniendo factura del traslado:', error?.code || error?.message || 'ERROR');
    return res.status(500).json({ msg: 'No se pudo obtener la factura' });
  }
};

// ==========================================
// 10. EXPORTACIONES
// ==========================================

export {
  obtenerChoferes,
  obtenerPlantas,
  createTrasladoEmpresarial,
  createTrasladoPersonal,
  createTrasladoPrivado,
  getTraslados,
  approveTraslado,
  finalizarTraslado,
  subirFacturaTraslado,
  verFacturaTraslado,
};
