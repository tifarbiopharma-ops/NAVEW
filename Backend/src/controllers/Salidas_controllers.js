import pool from '../database.js';
import { notificarLlegadaPedido } from '../telegram/telegramService.js';

const ensureSalidasTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS salidas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo VARCHAR(50) NOT NULL UNIQUE,
      solicitante_id INT NOT NULL,
      solicitante_nombre VARCHAR(150) NOT NULL,
      solicitante_cedula VARCHAR(20) DEFAULT NULL,
      area_origen VARCHAR(120) NOT NULL,
      destino VARCHAR(150) NOT NULL,
      departamento VARCHAR(150) NOT NULL,
      motivo TEXT NOT NULL,
      observaciones TEXT DEFAULT NULL,
      fecha_salida DATE NOT NULL,
      estado ENUM('pendiente','aprobado','rechazado','entregado') NOT NULL DEFAULT 'pendiente',
      aprobado_por INT DEFAULT NULL,
      aprobado_nombre VARCHAR(150) DEFAULT NULL,
      aprobado_at DATETIME DEFAULT NULL,
      qr_payload TEXT NOT NULL,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_salidas_estado (estado),
      INDEX idx_salidas_codigo (codigo),
      INDEX idx_salidas_solicitante (solicitante_id),
      FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL,
      FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.query(query);

  const [legacyColumn] = await pool.query(`
    SELECT COUNT(*) AS total
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'salidas'
      AND COLUMN_NAME = 'sede'
  `);

  if (Number(legacyColumn?.[0]?.total || 0) > 0) {
    await pool.query('ALTER TABLE salidas CHANGE COLUMN sede departamento VARCHAR(150) NOT NULL');
  }
};

const buildQrPayload = (salida) => {
  const payload = [
    'FARBIO-SALIDA',
    String(salida.id ?? ''),
    String(salida.codigo ?? ''),
    String(salida.solicitante_nombre ?? ''),
    String(salida.solicitante_cedula ?? ''),
    String(salida.area_origen ?? ''),
    String(salida.destino ?? ''),
    String(salida.departamento ?? ''),
    String(salida.motivo ?? ''),
    String(salida.fecha_salida ?? ''),
    String(salida.estado ?? 'pendiente'),
    String(salida.aprobado_nombre ?? ''),
  ].join('|');

  return payload;
};

const generarCodigoSalida = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM salidas');
  const total = Number(rows?.[0]?.total || 0) + 1;
  const year = new Date().getFullYear();
  return `SAL-${year}-${String(total).padStart(5, '0')}`;
};

const createSalida = async (req, res) => {
  await ensureSalidasTable();

  const userId = req.user?.id;
  const userRole = (req.user?.rol || '').toLowerCase();
  const nombre = req.user?.nombre || req.body.solicitante_nombre || 'Solicitante';
  const cedula = req.user?.cedula || req.body.solicitante_cedula || null;

  if (!userId) {
    return res.status(401).json({ success: false, msg: 'No autenticado' });
  }

  if (!userRole.includes('solicitante') && !userRole.includes('administrador')) {
    return res.status(403).json({ success: false, msg: 'Solo un solicitante o administrador puede crear una salida' });
  }

  const {
    area_origen,
    destino,
    departamento,
    motivo,
    observaciones,
    fecha_salida,
  } = req.body;

  if (!area_origen || !destino || !departamento || !motivo || !fecha_salida) {
    return res.status(400).json({ success: false, msg: 'Debe completar área de origen, destino, departamento, motivo y fecha de salida' });
  }

  try {
    const codigo = await generarCodigoSalida();
    const insert = `
      INSERT INTO salidas (
        codigo,
        solicitante_id,
        solicitante_nombre,
        solicitante_cedula,
        area_origen,
        destino,
        departamento,
        motivo,
        observaciones,
        fecha_salida,
        estado,
        qr_payload,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)
    `;

    const payload = JSON.stringify({
      codigo,
      solicitante: nombre,
      cedula,
      area_origen,
      destino,
      departamento,
      motivo,
      fecha_salida,
      estado: 'pendiente',
      status: 'farbio-salida-pendiente'
    });

    const [result] = await pool.query(insert, [
      codigo,
      userId,
      nombre,
      cedula,
      area_origen,
      destino,
      departamento,
      motivo,
      observaciones || null,
      fecha_salida,
      payload,
      userId,
    ]);

    const salidaId = result.insertId;
    const [rows] = await pool.query('SELECT * FROM salidas WHERE id = ?', [salidaId]);
    const salida = rows[0];

    return res.status(201).json({
      success: true,
      msg: 'Solicitud de salida creada',
      salida: {
        ...salida,
        qr_payload: buildQrPayload(salida)
      }
    });
  } catch (error) {
    console.error('Error al crear salida:', error);
    return res.status(500).json({ success: false, msg: 'Error al crear la salida', error: error.message });
  }
};

const getSalidas = async (req, res) => {
  await ensureSalidasTable();

  const userId = req.user?.id;
  const role = (req.user?.rol || '').toLowerCase();

  try {
    let query = 'SELECT * FROM salidas ORDER BY created_at DESC';
    let params = [];

    if (!role.includes('administrador') && !role.includes('jefe')) {
      query = 'SELECT * FROM salidas WHERE solicitante_id = ? ORDER BY created_at DESC';
      params = [userId];
    }

    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, salidas: rows.map((item) => ({ ...item, qr_payload: buildQrPayload(item) })) });
  } catch (error) {
    console.error('Error al obtener salidas:', error);
    return res.status(500).json({ success: false, msg: 'Error al consultar salidas', error: error.message });
  }
};

const approveSalida = async (req, res) => {
  await ensureSalidasTable();

  const { id } = req.params;
  const userId = req.user?.id;
  const role = (req.user?.rol || '').toLowerCase();

  if (!userId) {
    return res.status(401).json({ success: false, msg: 'No autenticado' });
  }

  if (!role.includes('jefe') && !role.includes('administrador')) {
    return res.status(403).json({ success: false, msg: 'Solo un jefe o administrador puede aprobar la salida' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM salidas WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, msg: 'Salida no encontrada' });
    }

    const salida = rows[0];
    const nombreAprobador = req.user?.nombre || 'Jefe';

    const update = `
      UPDATE salidas
      SET estado = 'aprobado',
          aprobado_por = ?,
          aprobado_nombre = ?,
          aprobado_at = NOW(),
          updated_at = NOW(),
          qr_payload = ?
      WHERE id = ?
    `;

    const payload = buildQrPayload({ ...salida, estado: 'aprobado', aprobado_nombre: nombreAprobador });
    await pool.query(update, [userId, nombreAprobador, payload, id]);

    return res.status(200).json({
      success: true,
      msg: 'Salida aprobada correctamente',
      aprobado_por: nombreAprobador,
      qr_payload: payload,
    });
  } catch (error) {
    console.error('Error al aprobar salida:', error);
    return res.status(500).json({ success: false, msg: 'Error al aprobar salida', error: error.message });
  }
};

const parseQrPayload = (rawPayload) => {
  if (!rawPayload) return {};

  if (typeof rawPayload === 'object') return rawPayload;

  const value = String(rawPayload).trim();

  try {
    return JSON.parse(value);
  } catch (error) {
    const parts = value.split('|');
    if (parts[0] !== 'FARBIO-SALIDA' || parts.length < 12) return {};

    return {
      id: parts[1],
      codigo: parts[2],
      solicitante: parts[3],
      cedula: parts[4],
      area_origen: parts[5],
      destino: parts[6],
      departamento: parts[7],
      motivo: parts[8],
      fecha_salida: parts[9],
      estado: parts[10],
      aprobado_por: parts[11] || null,
    };
  }
};

const validateQrSalida = async (req, res) => {
  await ensureSalidasTable();

  const userRole = (req.user?.rol || '').toLowerCase();
  if (!userRole.includes('supervisor') && !userRole.includes('administrador')) {
    return res.status(403).json({ success: false, msg: 'Solo un supervisor o administrador puede validar la salida' });
  }

  try {
    const { codigo, area_origen, destino, departamento, motivo, fecha_salida, solicitante } = req.body || {};

    if (!codigo) {
      return res.status(400).json({ success: false, msg: 'Falta el código de la salida' });
    }

    const [rows] = await pool.query('SELECT * FROM salidas WHERE codigo = ?', [codigo]);
    if (!rows.length) {
      return res.status(404).json({ success: false, msg: 'No se encontró la salida con ese QR' });
    }

    const salida = rows[0];
    const payload = parseQrPayload(salida.qr_payload || '{}');

    const expected = {
      codigo: salida.codigo,
      area_origen: salida.area_origen,
      destino: salida.destino,
      departamento: salida.departamento,
      motivo: salida.motivo,
      fecha_salida: salida.fecha_salida,
      solicitante: salida.solicitante_nombre,
      estado: salida.estado,
    };

    const provided = {
      codigo: codigo || payload.codigo,
      area_origen: area_origen || payload.area_origen,
      destino: destino || payload.destino,
      departamento: departamento || payload.departamento,
      motivo: motivo || payload.motivo,
      fecha_salida: fecha_salida || payload.fecha_salida,
      solicitante: solicitante || payload.solicitante,
      estado: salida.estado,
    };

    const validMatch = Object.keys(expected).every((key) => String(expected[key] ?? '') === String(provided[key] ?? ''));
    const isApproved = salida.estado === 'aprobado';

    if (!isApproved) {
      return res.status(200).json({
        success: false,
        valid: false,
        msg: 'La salida existe pero aún no está aprobada por el jefe',
        salida,
      });
    }

    if (!validMatch) {
      return res.status(200).json({
        success: false,
        valid: false,
        msg: 'Los datos del QR no coinciden con la salida registrada',
        expected,
        received: provided,
      });
    }

    await pool.query(
      "UPDATE salidas SET estado = 'entregado', updated_at = NOW() WHERE id = ?",
      [salida.id]
    );

    const [updatedRows] = await pool.query('SELECT * FROM salidas WHERE id = ?', [salida.id]);
    const salidaEntregada = updatedRows[0];

    await notificarLlegadaPedido({
      codigo: salidaEntregada.codigo,
      solicitante_nombre: salidaEntregada.solicitante_nombre,
      area_origen: salidaEntregada.area_origen,
      destino: salidaEntregada.destino,
      departamento: salidaEntregada.departamento,
      motivo: salidaEntregada.motivo,
      fecha_salida: salidaEntregada.fecha_salida,
    });

    return res.status(200).json({
      success: true,
      valid: true,
      msg: 'Salida validada correctamente. ✅ Ha llegado su pedido',
      check: '✅ PEDIDO RECIBIDO',
      salida: {
        ...salidaEntregada,
        qr_payload: buildQrPayload(salidaEntregada)
      }
    });
  } catch (error) {
    console.error('Error validando QR:', error);
    return res.status(500).json({ success: false, msg: 'Error validando salida', error: error.message });
  }
};

export {
  createSalida,
  getSalidas,
  approveSalida,
  validateQrSalida,
  ensureSalidasTable,
};
