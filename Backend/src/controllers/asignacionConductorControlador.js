import pool from '../database.js';
import { registrarReporteEnvio } from '../utils/reportesEnvios.js';

const esSupervisor = (req) => String(req.user?.rol || '').trim().toLowerCase() === 'supervisor';

const obtenerConductoresEnvio = async (req, res) => {
  if (!esSupervisor(req)) return res.status(403).json({ msg: 'Solo el supervisor puede asignar conductores' });
  try {
    const [conductores] = await pool.query("SELECT ID_COLABORADOR AS id, NOMBRE AS nombre FROM Colaboradores WHERE CARGO = 55 AND ESTADO = 'ACTIVO' ORDER BY NOMBRE");
    return res.json({ conductores });
  } catch (error) {
    console.error('No se pudieron consultar los conductores:', error.code);
    return res.status(500).json({ msg: 'No se pudieron consultar los conductores' });
  }
};

const asignarConductorEnvios = async (req, res) => {
  if (!esSupervisor(req)) return res.status(403).json({ msg: 'Solo el supervisor puede asignar conductores' });
  const { paquetes, idConductor } = req.body || {};
  if (!Array.isArray(paquetes) || paquetes.length < 1 || paquetes.length > 100 || paquetes.some((id) => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) || !Number.isSafeInteger(idConductor) || idConductor <= 0) {
    return res.status(400).json({ msg: 'Selecciona un conductor y entre 1 y 100 paquetes válidos' });
  }
  const ids = [...new Set(paquetes.map((id) => id.toLowerCase()))].sort();
  let connection;
  let transaccion = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccion = true;
    const [conductores] = await connection.query("SELECT ID_COLABORADOR, NOMBRE FROM Colaboradores WHERE ID_COLABORADOR = ? AND CARGO = 55 AND ESTADO = 'ACTIVO' FOR UPDATE", [idConductor]);
    if (!conductores.length) return res.status(400).json({ msg: 'El conductor seleccionado no está activo o no corresponde a un chofer' });
    const [envios] = await connection.query('SELECT ID_Paquete, Estado_Actual, QR_Llegada, ID_Conductor FROM Envios_Paqueteria WHERE ID_Paquete IN (?) ORDER BY ID_Paquete FOR UPDATE', [ids]);
    if (envios.length !== ids.length || envios.some((envio) => envio.Estado_Actual !== 'EN CAMINO' || envio.QR_Llegada)) {
      return res.status(409).json({ msg: 'Algún paquete ya no está En camino o no existe. Actualiza la lista y vuelve a seleccionarlos.' });
    }
    await connection.query('UPDATE Envios_Paqueteria SET ID_Conductor = ? WHERE ID_Paquete IN (?)', [idConductor, ids]);
    await connection.commit();
    transaccion = false;
    for (const envio of envios) {
      await registrarReporteEnvio({ usuarioId: req.user.id, usuarioNombre: req.user.nombre,
        accion: 'ASIGNAR_CONDUCTOR', idPaquete: envio.ID_Paquete,
        estadoAnterior: 'En camino', estadoNuevo: 'En camino',
        detalles: { conductor_anterior: envio.ID_Conductor, conductor_asignado: idConductor, conductor_nombre: conductores[0].NOMBRE },
      });
    }
    return res.json({ success: true, msg: `Conductor asignado a ${ids.length} paquete(s)`, conductor: { id: idConductor, nombre: conductores[0].NOMBRE } });
  } catch (error) {
    console.error('No se pudo asignar el conductor:', error.code);
    return res.status(500).json({ msg: 'No se pudo guardar la asignación del conductor' });
  } finally {
    if (transaccion) await connection.rollback();
    connection?.release();
  }
};

export { obtenerConductoresEnvio, asignarConductorEnvios };
