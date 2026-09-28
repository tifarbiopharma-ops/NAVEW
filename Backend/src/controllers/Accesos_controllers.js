import pool from '../database.js';
import crypto from 'crypto';
import { obtenerJefeDirecto } from '../utils/jerarquia.js';

const createAcceso = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const idSolicitante = req.user.id;
    const { 
      id_externo, area_visita, id_planta_destino, fecha_visita, motivo 
    } = req.body;

    if (!id_externo || !area_visita || !id_planta_destino || !fecha_visita) {
      return res.status(400).json({ msg: "Faltan campos obligatorios para el acceso de externo" });
    }

    // 1. Obtener el Jefe Directo del empleado visitado (el que registra)
    const idAprobador = await obtenerJefeDirecto(idSolicitante);
    
    if (!idAprobador) {
      return res.status(403).json({ 
        msg: "No se encontró un Jefe Directo asignado. Solo los jefes pueden autorizar el ingreso de externos." 
      });
    }

    await connection.beginTransaction();

    const idAcceso = crypto.randomUUID();
    
    // 2. Crear el Acceso
    await connection.query(
      `INSERT INTO Accesos_Externos 
      (ID_Acceso, ID_Externo, ID_Empleado_Visitado, Area_Visita, ID_Planta_Destino, Fecha_Visita, Motivo, Estado_Actual)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
      [idAcceso, id_externo, idSolicitante, area_visita, id_planta_destino, fecha_visita, motivo || null]
    );

    // 3. Crear la Aprobación
    await connection.query(
      `INSERT INTO Aprobaciones (TIPO_SOLICITUD, ID_SOLICITUD, NIVEL_APROBACION, ID_APROBADOR, ESTADO)
      VALUES ('ACCESO', ?, 1, ?, 'PENDIENTE')`,
      [idAcceso, idAprobador]
    );

    await connection.commit();

    return res.status(201).json({ 
      success: true, 
      msg: "Visita registrada. Enviada al Jefe Directo para autorización final.",
      idAcceso,
      idAprobador
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error registrando acceso:', error);
    res.status(500).json({ msg: "Error al registrar la visita", error: error.message });
  } finally {
    connection.release();
  }
};

const getAccesos = async (req, res) => {
  try {
    const idUsuario = req.user.id;
    const rol = req.user.rol.toLowerCase();

    let query = 'SELECT * FROM Accesos_Externos ORDER BY Fecha_Creacion DESC';
    let params = [];

    if (!['administrador', 'seguridad'].includes(rol)) {
      query = `
        SELECT e.* FROM Accesos_Externos e
        LEFT JOIN Aprobaciones a ON a.ID_SOLICITUD = e.ID_Acceso AND a.TIPO_SOLICITUD = 'ACCESO'
        WHERE e.ID_Empleado_Visitado = ? OR a.ID_APROBADOR = ?
        ORDER BY e.Fecha_Creacion DESC
      `;
      params = [idUsuario, idUsuario];
    }

    const [rows] = await pool.query(query, params);
    res.status(200).json({ success: true, accesos: rows });
  } catch (error) {
    res.status(500).json({ msg: "Error", error: error.message });
  }
};

const approveAcceso = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // ID_Acceso
    const idAprobador = req.user.id;
    const { accion, comentario } = req.body; // 'APROBADO' o 'RECHAZADO'

    if (!['APROBADO', 'RECHAZADO'].includes(accion)) {
      return res.status(400).json({ msg: "La acción debe ser APROBADO o RECHAZADO" });
    }

    await connection.beginTransaction();

    const [aprobaciones] = await connection.query(
      `SELECT ID_APROBACION FROM Aprobaciones 
       WHERE TIPO_SOLICITUD = 'ACCESO' AND ID_SOLICITUD = ? AND ID_APROBADOR = ? AND ESTADO = 'PENDIENTE'`,
      [id, idAprobador]
    );

    if (aprobaciones.length === 0) {
      await connection.rollback();
      return res.status(403).json({ msg: "No tienes permiso para autorizar este ingreso o ya fue procesado" });
    }

    const idAprobacion = aprobaciones[0].ID_APROBACION;

    await connection.query(
      `UPDATE Aprobaciones SET ESTADO = ?, COMENTARIO = ?, FECHA_RESPUESTA = NOW() WHERE ID_APROBACION = ?`,
      [accion, comentario || null, idAprobacion]
    );

    await connection.query(
      `UPDATE Accesos_Externos SET Estado_Actual = ? WHERE ID_Acceso = ?`,
      [accion, id]
    );

    await connection.commit();
    res.status(200).json({ success: true, msg: `Acceso de visitante ${accion.toLowerCase()} correctamente.` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ msg: "Error al autorizar acceso", error: error.message });
  } finally {
    connection.release();
  }
};

const validateQrAcceso = async (req, res) => {
  res.status(501).json({ msg: "Endpoint de validación QR no implementado aún" });
};

export {
  createAcceso,
  getAccesos,
  approveAcceso,
  validateQrAcceso,
};
