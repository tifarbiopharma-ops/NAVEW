import pool from '../database.js';
import crypto from 'crypto';
import { obtenerJefeDirecto } from '../utils/jerarquia.js';

const createEnvio = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const idSolicitante = req.user.id;
    const { 
      fecha_salida, tipo_contenido, comentario, 
      id_planta_origen, id_departamento_origen,
      id_planta_destino, id_departamento_destino, id_destinatario 
    } = req.body;

    if (!fecha_salida || !tipo_contenido || !id_planta_origen || !id_departamento_origen || !id_planta_destino || !id_departamento_destino || !id_destinatario) {
      return res.status(400).json({ msg: "Faltan campos obligatorios para el envío" });
    }

    // 1. Obtener el Jefe Directo del empleado que envía el paquete
    const idAprobador = await obtenerJefeDirecto(idSolicitante);
    
    if (!idAprobador) {
      return res.status(403).json({ 
        msg: "No se encontró un Jefe Directo asignado en el organigrama. No puede registrar envíos sin un aprobador." 
      });
    }

    await connection.beginTransaction();

    const idPaquete = crypto.randomUUID();
    
    // 2. Crear el Envío
    await connection.query(
      `INSERT INTO Envios_Paqueteria 
      (ID_Paquete, Fecha_Salida, Tipo_Contenido, Comentario, 
       ID_Planta_Origen, ID_Departamento_Origen, ID_Responsable, 
       ID_Planta_Destino, ID_Departamento_Destino, ID_Destinatario, Estado_Actual)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
      [
        idPaquete, fecha_salida, tipo_contenido, comentario || null, 
        id_planta_origen, id_departamento_origen, idSolicitante, 
        id_planta_destino, id_departamento_destino, id_destinatario
      ]
    );

    // 3. Crear la Aprobación
    await connection.query(
      `INSERT INTO Aprobaciones (TIPO_SOLICITUD, ID_SOLICITUD, NIVEL_APROBACION, ID_APROBADOR, ESTADO)
      VALUES ('ENVIO', ?, 1, ?, 'PENDIENTE')`,
      [idPaquete, idAprobador]
    );

    await connection.commit();

    return res.status(201).json({ 
      success: true, 
      msg: "Envío registrado correctamente. Enviado a su Jefe Directo para aprobación.",
      idPaquete,
      idAprobador
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creando envío:', error);
    res.status(500).json({ msg: "Error al registrar el envío", error: error.message });
  } finally {
    connection.release();
  }
};

const getEnvios = async (req, res) => {
  try {
    const idUsuario = req.user.id;
    const rol = req.user.rol.toLowerCase();

    let query = 'SELECT * FROM Envios_Paqueteria ORDER BY Fecha_Creacion DESC';
    let params = [];

    if (!['administrador', 'seguridad'].includes(rol)) {
      query = `
        SELECT e.* FROM Envios_Paqueteria e
        LEFT JOIN Aprobaciones a ON a.ID_SOLICITUD = e.ID_Paquete AND a.TIPO_SOLICITUD = 'ENVIO'
        WHERE e.ID_Responsable = ? OR a.ID_APROBADOR = ?
        ORDER BY e.Fecha_Creacion DESC
      `;
      params = [idUsuario, idUsuario];
    }

    const [rows] = await pool.query(query, params);
    res.status(200).json({ success: true, envios: rows });
  } catch (error) {
    res.status(500).json({ msg: "Error", error: error.message });
  }
};

const approveEnvio = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // ID_Paquete
    const idAprobador = req.user.id;
    const { accion, comentario } = req.body; // 'APROBADO' o 'RECHAZADO'

    if (!['APROBADO', 'RECHAZADO'].includes(accion)) {
      return res.status(400).json({ msg: "La acción debe ser APROBADO o RECHAZADO" });
    }

    await connection.beginTransaction();

    const [aprobaciones] = await connection.query(
      `SELECT ID_APROBACION FROM Aprobaciones 
       WHERE TIPO_SOLICITUD = 'ENVIO' AND ID_SOLICITUD = ? AND ID_APROBADOR = ? AND ESTADO = 'PENDIENTE'`,
      [id, idAprobador]
    );

    if (aprobaciones.length === 0) {
      await connection.rollback();
      return res.status(403).json({ msg: "No tienes permiso para aprobar este envío o ya fue procesado" });
    }

    const idAprobacion = aprobaciones[0].ID_APROBACION;

    await connection.query(
      `UPDATE Aprobaciones SET ESTADO = ?, COMENTARIO = ?, FECHA_RESPUESTA = NOW() WHERE ID_APROBACION = ?`,
      [accion, comentario || null, idAprobacion]
    );

    await connection.query(
      `UPDATE Envios_Paqueteria SET Estado_Actual = ? WHERE ID_Paquete = ?`,
      [accion, id]
    );

    await connection.commit();
    res.status(200).json({ success: true, msg: `Envío ${accion.toLowerCase()} correctamente.` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ msg: "Error al aprobar envío", error: error.message });
  } finally {
    connection.release();
  }
};

const validateQrEnvio = async (req, res) => {
  res.status(501).json({ msg: "Endpoint de validación QR no implementado aún" });
};

export {
  createEnvio,
  getEnvios,
  approveEnvio,
  validateQrEnvio,
};
