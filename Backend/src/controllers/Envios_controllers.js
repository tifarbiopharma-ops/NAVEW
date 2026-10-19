import crypto from 'node:crypto';
import pool from '../database.js';
import { obtenerColaboradoresACargo } from '../utils/jerarquia.js';
import { registrarReporteEnvio } from '../utils/reportesEnvios.js';

const ROLES_SOLICITUD = new Set(['solicitante', 'jefe', 'administrador']);



const obtenerCatalogosEnvio = async (req, res) => {
  try {
    const [plantas] = await pool.query(
      'SELECT ID_Planta AS id, Nombre_Planta AS nombre FROM Plantas ORDER BY Nombre_Planta'
    );
    const [areas] = await pool.query(
      'SELECT ID_AREAS AS id, AREA AS nombre FROM Areas ORDER BY AREA'
    );
    const [colaboradores] = await pool.query(
      `SELECT ID_COLABORADOR AS id, NOMBRE AS nombre, AREA AS areaId
       FROM Colaboradores WHERE ESTADO = 'ACTIVO' ORDER BY NOMBRE`
    );
    return res.status(200).json({ success: true, plantas, areas, colaboradores });
  } catch (error) {
    console.error('Error al obtener catalogos de paqueteria:', error);
    return res.status(500).json({ msg: 'No se pudieron cargar los catálogos' });
  }
};

const crearEnvioPaqueteria = async (req, res) => {
  const rol = String(req.user?.rol || '').toLowerCase();
  if (!ROLES_SOLICITUD.has(rol)) {
    return res.status(403).json({ msg: 'No tienes permiso para crear solicitudes de paquetería' });
  }
  const idColaborador = Number(req.user?.idColaborador);
  if (!Number.isSafeInteger(idColaborador) || idColaborador <= 0) {
    return res.status(403).json({ msg: 'Tu usuario no tiene un colaborador asociado' });
  }

  const {
    fecha_salida, hora_entrega, tipo_contenido, comentario,
    id_planta_origen, id_area_origen, id_responsable,
    id_planta_destino, id_area_destino, id_destinatario,
  } = req.body || {};

  // Los IDs de responsable y destinatario pertenecen a Colaboradores.
  const responsable = id_responsable == null || id_responsable === ''
    ? idColaborador : Number(id_responsable);
  const destinatario = Number(id_destinatario);
  const camposRequeridos = [
    fecha_salida, tipo_contenido, id_planta_origen, id_area_origen,
    responsable, id_planta_destino, id_area_destino, id_destinatario,
  ];
  if (camposRequeridos.some((campo) => campo === undefined || campo === null || campo === '')) {
    return res.status(400).json({ msg: 'Completa todos los campos obligatorios de la solicitud' });
  }
  if (!Number.isSafeInteger(responsable) || responsable <= 0 ||
      !Number.isSafeInteger(destinatario) || destinatario <= 0) {
    return res.status(400).json({ msg: 'El responsable y destinatario deben ser colaboradores válidos' });
  }
  if (typeof tipo_contenido !== 'string' || !tipo_contenido.trim()) {
    return res.status(400).json({ msg: 'El tipo de contenido es obligatorio' });
  }
  if (String(id_planta_origen) === String(id_planta_destino)) {
    return res.status(400).json({ msg: 'La planta de origen y la planta de destino deben ser diferentes' });
  }
  if (responsable === destinatario) {
    return res.status(400).json({ msg: 'El responsable y el destinatario deben ser diferentes' });
  }

  let connection;
  let transaccionIniciada = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccionIniciada = true;

    const [responsableValido] = await connection.query(
      `SELECT ID_COLABORADOR FROM Colaboradores
       WHERE ID_COLABORADOR = ? AND ESTADO = 'ACTIVO'`, [responsable]
    );
    const [destinatarioValido] = await connection.query(
      `SELECT ID_COLABORADOR FROM Colaboradores
       WHERE ID_COLABORADOR = ? AND ESTADO = 'ACTIVO'`, [destinatario]
    );
    if (!responsableValido.length || !destinatarioValido.length) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(400).json({ msg: 'El responsable o destinatario no es un colaborador activo' });
    }

    const idPaquete = crypto.randomUUID();
    const qrToken = `PAQUETERIA|${idPaquete}`;
    await connection.query(
      `INSERT INTO Envios_Paqueteria
       (ID_Paquete, Fecha_Salida, Hora_Entrega, Tipo_Contenido, Comentario,
        ID_Planta_Origen, ID_Area_Origen, ID_Responsable,
        ID_Planta_Destino, ID_Area_Destino, ID_Destinatario, Estado_Actual, QR_Token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Solicitado', ?)`,
      [idPaquete, fecha_salida, hora_entrega || null, tipo_contenido.trim(),
       typeof comentario === 'string' ? comentario.trim() || null : null,
       id_planta_origen, id_area_origen, responsable,
       id_planta_destino, id_area_destino, destinatario, qrToken]
    );

    await registrarEvento(connection, idPaquete, 'Solicitado', idColaborador, {
      tipo_contenido: tipo_contenido.trim(),
    });
    await connection.commit();
    transaccionIniciada = false;

    // La auditoria usa usuarios.id, no Colaboradores.ID_COLABORADOR.
    // Se ejecuta tras el commit y el helper gestiona sus propios errores.
    await registrarReporteEnvio({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre ?? null,
      accion: 'CREAR_ENVIO',
      idPaquete,
      estadoAnterior: null,
      estadoNuevo: 'Solicitado',
      detalles: { tipo_contenido: tipo_contenido.trim() },
    });

    return res.status(201).json({
      success: true, msg: 'Solicitud de paquetería creada', idPaquete, qrToken,
    });
  } catch (error) {
    if (connection && transaccionIniciada) {
      try { await connection.rollback(); } catch (rollbackError) {
        console.error('Error al revertir la transaccion de paqueteria:', rollbackError);
      }
    }
    console.error('Error al crear envio de paqueteria:', error);
    return res.status(500).json({ msg: 'No se pudo crear la solicitud de paquetería' });
  } finally {
    if (connection) connection.release();
  }
};

const obtenerEnviosPaqueteria = async (req, res) => {
  try {
    const rol = String(req.user?.rol || '').toLowerCase();
    const idColaborador = Number(req.user?.idColaborador);
    if (!Number.isSafeInteger(idColaborador) || idColaborador <= 0) {
      return res.status(403).json({ msg: 'Tu usuario no tiene un colaborador asociado' });
    }

    let filtro = '';
    const params = [];
    if (rol === 'jefe' && req.query.historico === '1') {
      filtro = 'WHERE e.ID_Responsable = ?';
      params.push(idColaborador);
    } else if (rol === 'jefe') {
      const subordinados = await obtenerColaboradoresACargo(idColaborador);
      const idsVisibles = [...new Set([...(subordinados || []), idColaborador])];
      filtro = idsVisibles.length
        ? `WHERE e.ID_Responsable IN (${idsVisibles.map(() => '?').join(', ')})
           OR e.ID_Destinatario IN (${idsVisibles.map(() => '?').join(', ')})`
        : 'WHERE 1 = 0';
      params.push(...idsVisibles, ...idsVisibles);
    } else if (!['administrador', 'supervisor'].includes(rol)) {
      filtro = 'WHERE e.ID_Responsable = ? OR e.ID_Destinatario = ?';
      params.push(idColaborador, idColaborador);
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
    console.error('Error al obtener envios de paqueteria:', error);
    return res.status(500).json({ msg: 'No se pudo cargar el historial de paquetería' });
  }
};

export { obtenerCatalogosEnvio, crearEnvioPaqueteria, obtenerEnviosPaqueteria };