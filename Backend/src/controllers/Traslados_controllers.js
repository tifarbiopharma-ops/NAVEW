import pool from '../database.js';
import crypto from 'crypto';
import { obtenerJefeDirecto } from '../utils/jerarquia.js';

// ==========================================
// 1. HELPERS
// ==========================================

const insertEventLog = async (connection, idTransaccion, tipoModulo, faseEstado, idActor, detallesExtra = null) => {
  await connection.query(
    `INSERT INTO Eventos_Process_Mining 
    (ID_Transaccion, Tipo_Modulo, Fase_Estado, ID_Usuario_Actor, Detalles_Extra)
    VALUES (?, ?, ?, ?, ?)`,
    [idTransaccion, tipoModulo, faseEstado, idActor, detallesExtra ? JSON.stringify(detallesExtra) : null]
  );
};

const setupTraslado = async (req, res, connection, tipoTraslado, extraFields, extraValues) => {
  const idSolicitante = req.user.id;
  const { 
    fecha_salida, hora_salida, motivo_viaje, observaciones,
    id_planta_origen, id_planta_destino 
  } = req.body;

  if (!fecha_salida || !hora_salida || !id_planta_origen || !id_planta_destino) {
    throw new Error("Faltan campos obligatorios para el traslado (Fecha, hora, origen, destino)");
  }

  // Validación de Tiempo (15 min tolerancia) para Transporte Privado
  if (tipoTraslado === 'PRIVADO') {
    const serverTime = new Date();
    const serverHours = serverTime.getHours();
    const serverMinutes = serverTime.getMinutes();
    const totalServerMinutes = serverHours * 60 + serverMinutes;

    const [reqHours, reqMinutes] = hora_salida.split(':').map(Number);
    const totalReqMinutes = reqHours * 60 + reqMinutes;

    const diff = Math.abs(totalServerMinutes - totalReqMinutes);
    if (diff > 15) {
      // Dejaremos flag para loguear la desviación abajo
      extraValues.push(diff);
      extraFields.push('desviacion'); // pseudo-field
    }
  }

  const idAprobador = await obtenerJefeDirecto(idSolicitante);
  if (!idAprobador) {
    throw new Error("No se encontró un Jefe Directo asignado en el organigrama.");
  }

  const idTraslado = crypto.randomUUID();
  
  // Limpiar campos para el insert
  const actualExtraFields = extraFields.filter(f => f !== 'desviacion');
  const actualExtraValues = extraValues.filter((_, i) => extraFields[i] !== 'desviacion');

  const insertFields = ['ID_Traslado', 'Tipo_Traslado', 'Fecha_Salida', 'Hora_Salida', 'Motivo_Viaje', 'Observaciones', 'Estado_Actual', 'ID_Solicitante', 'ID_Planta_Origen', 'ID_Planta_Destino', ...actualExtraFields].join(', ');
  const placeholders = Array(10 + actualExtraFields.length).fill('?').join(', ');
  
  await connection.query(
    `INSERT INTO Traslados_Personal (${insertFields}) VALUES (${placeholders})`,
    [idTraslado, tipoTraslado, fecha_salida, hora_salida, motivo_viaje, observaciones || null, 'SOLICITADO', idSolicitante, id_planta_origen, id_planta_destino, ...actualExtraValues]
  );

  await connection.query(
    `INSERT INTO Aprobaciones (TIPO_SOLICITUD, ID_SOLICITUD, NIVEL_APROBACION, ID_APROBADOR, ESTADO) VALUES ('TRASLADO', ?, 1, ?, 'PENDIENTE')`,
    [idTraslado, idAprobador]
  );

  await insertEventLog(connection, idTraslado, 'TRASLADO', 'SOLICITADO', idSolicitante);

  // Si hubo desviación de tiempo, insertar el log de minería de procesos
  if (extraFields.includes('desviacion')) {
    const diff = extraValues[extraFields.indexOf('desviacion')];
    await insertEventLog(connection, idTraslado, 'TRASLADO', 'DESVIACION_TIEMPO', idSolicitante, { diferencia_minutos: diff, hora_planificada: hora_salida });
  }

  return { idTraslado, idAprobador };
};

// ==========================================
// 2. CREATE ENDPOINTS (Formularios)
// ==========================================

export const createTrasladoEmpresarial = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_chofer, km_inicial, km_final } = req.body;
    if (!id_chofer) return res.status(400).json({ msg: "Falta ID de chofer para transporte empresarial" });

    await connection.beginTransaction();
    const result = await setupTraslado(req, res, connection, 'EMPRESARIAL', 
      ['ID_Chofer', 'Km_Inicial', 'Km_Final'], 
      [id_chofer, km_inicial || null, km_final || null]
    );
    await connection.commit();
    res.status(201).json({ success: true, msg: "Transporte Empresarial registrado", ...result });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ msg: error.message || "Error al crear", error });
  } finally {
    connection.release();
  }
};

export const createTrasladoPersonal = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { km_inicial, km_final, monto_solicitado, evidencia_costo } = req.body;
    await connection.beginTransaction();
    const result = await setupTraslado(req, res, connection, 'PERSONAL', 
      ['Km_Inicial', 'Km_Final', 'Monto_Solicitado', 'Evidencia_Costo'], 
      [km_inicial || null, km_final || null, monto_solicitado || null, evidencia_costo || null]
    );
    await connection.commit();
    res.status(201).json({ success: true, msg: "Transporte Personal registrado", ...result });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ msg: error.message || "Error al crear", error });
  } finally {
    connection.release();
  }
};

export const createTrasladoPrivado = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { monto_solicitado, evidencia_costo } = req.body;
    await connection.beginTransaction();
    const result = await setupTraslado(req, res, connection, 'PRIVADO', 
      ['Monto_Solicitado', 'Evidencia_Costo'], 
      [monto_solicitado || null, evidencia_costo || null]
    );
    await connection.commit();
    res.status(201).json({ success: true, msg: "Transporte Privado registrado", ...result });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ msg: error.message || "Error al crear", error });
  } finally {
    connection.release();
  }
};

// ==========================================
// 3. GET HISTÓRICO Y PROGRESO
// ==========================================

export const getTraslados = async (req, res) => {
  try {
    const idUsuario = req.user.id;
    const rol = req.user.rol.toLowerCase();

    let query = 'SELECT * FROM Traslados_Personal ORDER BY Fecha_Creacion DESC';
    let params = [];

    if (!['administrador', 'seguridad'].includes(rol)) {
      if (rol === 'jefe') {
        query = `
          SELECT t.* FROM Traslados_Personal t
          LEFT JOIN Aprobaciones a ON a.ID_SOLICITUD = t.ID_Traslado AND a.TIPO_SOLICITUD = 'TRASLADO'
          WHERE t.ID_Solicitante = ? OR a.ID_APROBADOR = ?
          ORDER BY t.Fecha_Creacion DESC
        `;
        params = [idUsuario, idUsuario];
      } else {
        query = 'SELECT * FROM Traslados_Personal WHERE ID_Solicitante = ? ORDER BY Fecha_Creacion DESC';
        params = [idUsuario];
      }
    }

    const [rows] = await pool.query(query, params);
    res.status(200).json({ success: true, traslados: rows });
  } catch (error) {
    res.status(500).json({ msg: "Error al consultar historial", error: error.message });
  }
};

export const getProgresoTraslado = async (req, res) => {
  try {
    const { id } = req.params; // ID_Traslado
    const [rows] = await pool.query(
      `SELECT Fase_Estado, Timestamp_Evento, Detalles_Extra, col.NOMBRE as Actor
       FROM Eventos_Process_Mining evt
       LEFT JOIN Colaboradores col ON evt.ID_Usuario_Actor = col.ID_COLABORADOR
       WHERE ID_Transaccion = ? AND Tipo_Modulo = 'TRASLADO'
       ORDER BY Timestamp_Evento ASC`,
      [id]
    );
    res.status(200).json({ success: true, progreso: rows });
  } catch (error) {
    res.status(500).json({ msg: "Error al consultar progreso", error: error.message });
  }
};

// ==========================================
// 4. APROBACIÓN (JEFE)
// ==========================================

export const approveTraslado = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const idAprobador = req.user.id;
    const { accion, comentario } = req.body; // 'APROBADO_JEFE' o 'RECHAZADO'

    const dbEstado = accion === 'APROBADO_JEFE' ? 'APROBADO_JEFE' : 'RECHAZADO';

    await connection.beginTransaction();

    const [aprobaciones] = await connection.query(
      `SELECT ID_APROBACION FROM Aprobaciones 
       WHERE TIPO_SOLICITUD = 'TRASLADO' AND ID_SOLICITUD = ? AND ID_APROBADOR = ? AND ESTADO = 'PENDIENTE'`,
      [id, idAprobador]
    );

    if (aprobaciones.length === 0) {
      await connection.rollback();
      return res.status(403).json({ msg: "No tienes permiso para aprobar o ya fue procesada" });
    }

    await connection.query(
      `UPDATE Aprobaciones SET ESTADO = ?, COMENTARIO = ?, FECHA_RESPUESTA = NOW() WHERE ID_APROBACION = ?`,
      [dbEstado, comentario || null, aprobaciones[0].ID_APROBACION]
    );

    await connection.query(
      `UPDATE Traslados_Personal SET Estado_Actual = ? WHERE ID_Traslado = ?`,
      [dbEstado, id]
    );

    await insertEventLog(connection, id, 'TRASLADO', dbEstado, idAprobador, { comentario });

    await connection.commit();
    res.status(200).json({ success: true, msg: `Solicitud ${dbEstado.toLowerCase()}` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ msg: "Error", error: error.message });
  } finally {
    connection.release();
  }
};

// ==========================================
// 5. ESCANEOS EN GARITA (Seguridad)
// ==========================================

export const registrarSalidaGarita = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // ID_Traslado (leído del QR)
    const idGuardia = req.user.id;
    const { km_inicial, observaciones } = req.body;

    await connection.beginTransaction();
    
    // Solo actualizar si estaba APROBADO_JEFE
    const [traslado] = await connection.query(`SELECT Estado_Actual, Tipo_Traslado FROM Traslados_Personal WHERE ID_Traslado = ?`, [id]);
    if (!traslado.length || traslado[0].Estado_Actual !== 'APROBADO_JEFE') {
      await connection.rollback();
      return res.status(400).json({ msg: "El traslado no está aprobado o ya salió." });
    }

    let updates = `Estado_Actual = 'ESCANEADO_ORIGEN', Observaciones = CONCAT_WS(' | ', Observaciones, ?)`;
    let params = [observaciones || 'Salida en garita', id];

    if (traslado[0].Tipo_Traslado === 'EMPRESARIAL' || traslado[0].Tipo_Traslado === 'PERSONAL') {
      if (!km_inicial) {
        await connection.rollback();
        return res.status(400).json({ msg: "Debe ingresar Km Inicial para este tipo de transporte." });
      }
      updates = `Estado_Actual = 'ESCANEADO_ORIGEN', Km_Inicial = ?, Observaciones = CONCAT_WS(' | ', Observaciones, ?)`;
      params = [km_inicial, observaciones || 'Salida en garita', id];
    }

    await connection.query(`UPDATE Traslados_Personal SET ${updates} WHERE ID_Traslado = ?`, params);
    await insertEventLog(connection, id, 'TRASLADO', 'ESCANEADO_ORIGEN', idGuardia, { km_inicial, observaciones });

    await connection.commit();
    res.status(200).json({ success: true, msg: "Salida registrada en garita exitosamente." });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ msg: "Error", error: error.message });
  } finally {
    connection.release();
  }
};

export const registrarLlegadaGarita = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const idGuardia = req.user.id;
    const { km_final, observaciones } = req.body;

    await connection.beginTransaction();
    
    const [traslado] = await connection.query(`SELECT Estado_Actual, Tipo_Traslado FROM Traslados_Personal WHERE ID_Traslado = ?`, [id]);
    if (!traslado.length || traslado[0].Estado_Actual !== 'ESCANEADO_ORIGEN') {
      await connection.rollback();
      return res.status(400).json({ msg: "El traslado no ha salido o ya llegó." });
    }

    let updates = `Estado_Actual = 'ESCANEADO_DESTINO', Hora_Llegada = CURRENT_TIME(), Observaciones = CONCAT_WS(' | ', Observaciones, ?)`;
    let params = [observaciones || 'Llegada en garita', id];

    if (traslado[0].Tipo_Traslado === 'EMPRESARIAL' || traslado[0].Tipo_Traslado === 'PERSONAL') {
      if (!km_final) {
        await connection.rollback();
        return res.status(400).json({ msg: "Debe ingresar Km Final para este tipo de transporte." });
      }
      updates = `Estado_Actual = 'ESCANEADO_DESTINO', Hora_Llegada = CURRENT_TIME(), Km_Final = ?, Observaciones = CONCAT_WS(' | ', Observaciones, ?)`;
      params = [km_final, observaciones || 'Llegada en garita', id];
    }

    await connection.query(`UPDATE Traslados_Personal SET ${updates} WHERE ID_Traslado = ?`, params);
    await insertEventLog(connection, id, 'TRASLADO', 'ESCANEADO_DESTINO', idGuardia, { km_final, observaciones });

    await connection.commit();
    res.status(200).json({ success: true, msg: "Llegada registrada en garita exitosamente." });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ msg: "Error", error: error.message });
  } finally {
    connection.release();
  }
};
