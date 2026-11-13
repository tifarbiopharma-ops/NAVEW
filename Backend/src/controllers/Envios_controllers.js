
import crypto from 'node:crypto';
import pool from '../database.js';
import { obtenerColaboradoresACargo } from '../utils/organigrama/index.js';
import { registrarReporteEnvio } from '../utils/reportesEnvios.js';
import { ROLES_SUPERIORES } from '../middlewares/roles.js';
import { estadoEnvioEnBase, mostrarEstadoEnvio } from '../utils/estadosEnvio.js';

const ROLES_SOLICITUD = new Set([
  'solicitante',
  'jefe',
  'administrador',
  'supervisor',
  'subgerente',
  'gerente',
  'gerentegeneral',
  'subgerentegeneral',
]);


const obtenerCatalogosEnvio = async (req, res) => {
  try {
    const idColaborador = Number(req.user?.idColaborador);

    if (!Number.isSafeInteger(idColaborador) || idColaborador <= 0) {
      return res.status(403).json({
        msg: 'Tu usuario no tiene un colaborador asociado',
      });
    }

    const [[plantas], [areas], [colaboradores]] = await Promise.all([
      pool.query(
        `SELECT
            ID_UBICACIONES AS id,
            DESCRIPCION AS nombre
         FROM Ubicaciones
         ORDER BY DESCRIPCION`
      ),

      pool.query(
        `SELECT
            ID_AREAS AS id,
            AREA AS nombre
         FROM Areas
         ORDER BY AREA`
      ),

      pool.query(
        `SELECT
            c.ID_COLABORADOR AS id,
            c.NOMBRE AS nombre,
            a.ID_AREAS AS areaId,
            c.UBICACION AS ubicacionId
        FROM Colaboradores c
        LEFT JOIN Cargos ca
          ON ca.ID_CARGOS = c.CARGO
        LEFT JOIN Areas a
          ON a.ID_AREAS = ca.AREA
        WHERE c.ESTADO = 'ACTIVO'
        ORDER BY c.NOMBRE`
      ),
    ]);

    const responsable = colaboradores.find(
      (item) => Number(item.id) === idColaborador
    );

    return res.status(200).json({
      success: true,
      plantas,
      areas,
      colaboradores,
      usuarioActual: {
        idColaborador,
        nombre: responsable?.nombre || req.user.nombre || null,
      },
    });
  } catch (error) {
    console.error('Error al obtener catálogos de envío:', error);

    return res.status(500).json({
      success: false,
      msg: 'No se pudieron cargar los catálogos de envío',
    });
  }
};


const crearEnvioPaqueteria = async (req, res) => {
  const rol = String(req.user?.rol || '').toLowerCase();

  if (!ROLES_SOLICITUD.has(rol)) {
    return res.status(403).json({
      msg: 'No tienes permiso para crear solicitudes de paquetería',
    });
  }

  const idColaborador = Number(req.user?.idColaborador);

  if (!Number.isSafeInteger(idColaborador) || idColaborador <= 0) {
    return res.status(403).json({
      msg: 'Tu usuario no tiene un colaborador asociado',
    });
  }

  const {
    fecha_salida,
    hora_entrega,
    tipo_contenido,
    comentario,
    id_planta_origen,
    id_area_origen,
    id_planta_destino,
    id_area_destino,
    id_destinatario,
  } = req.body || {};

  // El responsable se obtiene del usuario autenticado.
  const responsable = idColaborador;
  const destinatario = Number(id_destinatario);

  const camposRequeridos = [
    fecha_salida,
    tipo_contenido,
    id_planta_origen,
    id_area_origen,
    id_planta_destino,
    id_area_destino,
    id_destinatario,
  ];

  if (
    camposRequeridos.some(
      (campo) =>
        campo === undefined ||
        campo === null ||
        campo === ''
    )
  ) {
    return res.status(400).json({
      msg: 'Completa todos los campos obligatorios de la solicitud',
    });
  }

  if (!Number.isSafeInteger(destinatario) || destinatario <= 0) {
    return res.status(400).json({
      msg: 'El destinatario debe ser un colaborador válido',
    });
  }

  if (
    typeof tipo_contenido !== 'string' ||
    !tipo_contenido.trim()
  ) {
    return res.status(400).json({
      msg: 'El tipo de contenido es obligatorio',
    });
  }

  if (String(id_planta_origen) === String(id_planta_destino)) {
    return res.status(400).json({
      msg: 'La planta de origen y la planta de destino deben ser diferentes',
    });
  }

  if (responsable === destinatario) {
    return res.status(400).json({
      msg: 'El responsable y el destinatario deben ser diferentes',
    });
  }

  let connection;
  let transaccionIniciada = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccionIniciada = true;

    const [responsableValido] = await connection.query(
      `SELECT ID_COLABORADOR, NOMBRE
       FROM Colaboradores
       WHERE ID_COLABORADOR = ?
         AND ESTADO = 'ACTIVO'`,
      [responsable]
    );

    const [destinatarioValido] = await connection.query(
      `SELECT ID_COLABORADOR, NOMBRE
       FROM Colaboradores
       WHERE ID_COLABORADOR = ?
         AND ESTADO = 'ACTIVO'`,
      [destinatario]
    );

    if (!responsableValido.length || !destinatarioValido.length) {
      await connection.rollback();
      transaccionIniciada = false;

      return res.status(400).json({
        msg: 'El responsable o destinatario no es un colaborador activo',
      });
    }

    const [ubicaciones] = await connection.query(
      `SELECT
          (SELECT DESCRIPCION FROM Ubicaciones WHERE ID_UBICACIONES = ?) AS planta_origen,
          (SELECT AREA FROM Areas WHERE ID_AREAS = ?) AS area_origen,
          (SELECT DESCRIPCION FROM Ubicaciones WHERE ID_UBICACIONES = ?) AS planta_destino,
          (SELECT AREA FROM Areas WHERE ID_AREAS = ?) AS area_destino`,
      [
        id_planta_origen,
        id_area_origen,
        id_planta_destino,
        id_area_destino,
      ]
    );

    const ubicacion = ubicaciones[0];

    if (
      !ubicacion.planta_origen ||
      !ubicacion.area_origen ||
      !ubicacion.planta_destino ||
      !ubicacion.area_destino
    ) {
      await connection.rollback();
      transaccionIniciada = false;

      return res.status(400).json({
        msg: 'Alguna planta o área seleccionada no existe',
      });
    }

    const idPaquete = crypto.randomUUID();
    const qrToken = `PAQUETERIA|${idPaquete}`;

    await connection.query(
      `INSERT INTO Envios_Paqueteria
      (
        ID_Paquete,
        Fecha_Salida,
        Hora_Entrega,
        Tipo_Contenido,
        Comentario,
        ID_Ubicacion_Origen,
        ID_Area_Origen,
        ID_Responsable,
        ID_Ubicacion_Destino,
        ID_Area_Destino,
        ID_Destinatario,
        Estado_Actual,
        QR_Token
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idPaquete,
        fecha_salida,
        hora_entrega || null,
        tipo_contenido.trim(),
        typeof comentario === 'string'
          ? comentario.trim() || null
          : null,
        id_planta_origen,
        id_area_origen,
        responsable,
        id_planta_destino,
        id_area_destino,
        destinatario,
        estadoEnvioEnBase('Solicitado'),
        qrToken,
      ]
    );

    await connection.commit();
    transaccionIniciada = false;

    try {
      await registrarReporteEnvio({
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre ?? null,
        accion: 'CREAR_ENVIO',
        idPaquete,
        estadoAnterior: null,
        estadoNuevo: 'Solicitado',
        detalles: {
          fecha_salida,
          hora_entrega: hora_entrega || null,
          tipo_contenido: tipo_contenido.trim(),
          comentario:
            typeof comentario === 'string'
              ? comentario.trim() || null
              : null,

          planta_origen: ubicacion.planta_origen,
          area_origen: ubicacion.area_origen,
          responsable: responsableValido[0].NOMBRE,

          planta_destino: ubicacion.planta_destino,
          area_destino: ubicacion.area_destino,
          destinatario: destinatarioValido[0].NOMBRE,
        },
      });
    } catch (auditError) {
      console.error(
        'No se pudo registrar la auditoría del envío:',
        auditError
      );
    }

    return res.status(201).json({
      success: true,
      msg: 'Solicitud de paquetería creada',
      idPaquete,
      qrToken,
    });
  } catch (error) {
    if (connection && transaccionIniciada) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          'Error al revertir la transacción de paquetería:',
          rollbackError
        );
      }
    }

    console.error('Error al crear envío de paquetería:', error);

    return res.status(500).json({
      msg: 'No se pudo crear la solicitud de paquetería',
    });
  } finally {
    if (connection) connection.release();
  }
};

const obtenerEnviosPaqueteria = async (req, res) => {
  try {
    const rol = String(req.user?.rol || '').toLowerCase();
    const idColaborador = Number(req.user?.idColaborador);

    if (!Number.isSafeInteger(idColaborador) || idColaborador <= 0) {
      return res.status(403).json({
        msg: 'Tu usuario no tiene un colaborador asociado',
      });
    }

    let filtro = '';
    const params = [];

    if (ROLES_SUPERIORES.includes(rol)) {
      const subordinados = await obtenerColaboradoresACargo(idColaborador);

      const idsVisibles = [
        ...new Set([...(subordinados || []), idColaborador]),
      ];

      filtro = idsVisibles.length
        ? `WHERE (
             e.ID_Responsable IN (${idsVisibles.map(() => '?').join(', ')})
             OR e.ID_Destinatario IN (${idsVisibles.map(() => '?').join(', ')})
           )`
        : 'WHERE 1 = 0';

      params.push(...idsVisibles, ...idsVisibles);
    } else if (!['administrador', 'supervisor'].includes(rol)) {
      filtro = 'WHERE (e.ID_Responsable = ? OR e.ID_Destinatario = ?)';
      params.push(idColaborador, idColaborador);
    }

    const [envios] = await pool.query(
      `SELECT
        e.*,
        resp.NOMBRE AS responsable_nombre,
        dest.NOMBRE AS destinatario_nombre,
        conductor.NOMBRE AS conductor_nombre,
        po.DESCRIPCION AS planta_origen_nombre,
        pd.DESCRIPCION AS planta_destino_nombre,
        area_origen.AREA AS area_origen_nombre,
        area_destino.AREA AS area_destino_nombre
      FROM Envios_Paqueteria e
      LEFT JOIN Colaboradores conductor ON conductor.ID_COLABORADOR = e.ID_Conductor
      INNER JOIN Colaboradores resp
        ON resp.ID_COLABORADOR = e.ID_Responsable
      INNER JOIN Colaboradores dest
        ON dest.ID_COLABORADOR = e.ID_Destinatario
      INNER JOIN Ubicaciones po
        ON po.ID_UBICACIONES = e.ID_Ubicacion_Origen
      INNER JOIN Ubicaciones pd
        ON pd.ID_UBICACIONES = e.ID_Ubicacion_Destino
      INNER JOIN Areas area_origen
        ON area_origen.ID_AREAS = e.ID_Area_Origen
      INNER JOIN Areas area_destino
        ON area_destino.ID_AREAS = e.ID_Area_Destino
      ${filtro}
      ORDER BY e.Fecha_Creacion DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      envios: envios.map((envio) => ({
        ...envio,
        Estado_Actual: mostrarEstadoEnvio(envio.Estado_Actual),
      })),
    });
  } catch (error) {
    console.error('Error al obtener envíos de paquetería:', error);

    return res.status(500).json({
      msg: 'No se pudo cargar el historial de paquetería',
    });
  }
};

export {
  obtenerCatalogosEnvio,
  crearEnvioPaqueteria,
  obtenerEnviosPaqueteria,
};
