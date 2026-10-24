import pool from '../database.js';
import { registrarReporteAcceso } from '../utils/reportesAccesos.js';
import { registrarReporteTraslado } from '../utils/reportesTraslados.js';
import { registrarReporteEnvio } from '../utils/reportesEnvios.js';
import { notificarLlegadaPedido } from '../telegram/telegramService.js';

const MINUTOS_COOLDOWN = 5; // 5 minutos anti-duplicado (mismo escaneo)
const intentosRecientes = new Map(); // idPaquete:tipoEscaneo -> timestamp

const auditar = async (helper, datos) => {
  try {
    const ok = await helper(datos);
    if (!ok) console.error('Auditoría QR no registrada:', datos.accion);
  } catch (error) {
    console.error('Error en auditoría QR:', error.code || 'ERROR');
  }
};

const verificarQRExterno = async (req, res) => {
  const connection = await pool.getConnection();
  let enTransaccion = false;
  try {
    if (!req.user?.id) return res.status(401).json({ msg: 'Autenticación requerida' });
    const { token_qr } = req.body;
    const partes = String(token_qr || '').split('|');
    const idAcceso = partes[1];
    // Buscar la parte que contiene ACOMPANANTES (sin importar el separador exacto)
    const parteAcompanantes = partes.find((parte) => /ACOMPANANTES\s*[:=]\s*\d+/i.test(parte));
    const acompanantesQr = parteAcompanantes
      ? Number(parteAcompanantes.split(/[:=]/)[1].trim())
      : 0;

    if (partes[0] !== 'EXTERNO' || !idAcceso || !Number.isInteger(acompanantesQr)) {
      return res.status(400).json({ msg: 'El QR de acceso externo no tiene un formato válido' });
    }

    const [rows] = await connection.query(
      `SELECT a.ID_Acceso, a.ID_Externo, a.Numero_Acompanantes, a.Estado_Actual,
              a.QR_Token, a.QR_Salida, a.QR_Entrada,
              ext.Nombre_Apellido AS externo_nombre, ext.Cedula AS externo_cedula,
              ext.Empresa AS externo_empresa
       FROM Accesos_Externos a
       INNER JOIN Externos ext ON ext.ID_Externo = a.ID_Externo
       WHERE a.ID_Acceso = ? AND a.QR_Token = ?`,
      [idAcceso, token_qr]
    );
    if (!rows.length) return res.status(404).json({ msg: 'Código QR de acceso externo no encontrado' });

    const acceso = rows[0];
    if (Number(acceso.Numero_Acompanantes) !== acompanantesQr) {
      return res.status(400).json({ msg: 'El número de acompañantes del QR no coincide con la solicitud' });
    }
    if (acceso.QR_Salida) {
      return res.status(400).json({ msg: 'Este código QR ya fue registrado en salida y entrada' });
    }
    if (acceso.Estado_Actual !== 'Aprobado' && acceso.Estado_Actual !== 'Entrada registrada') {
      return res.status(400).json({ msg: 'El acceso externo no está disponible para escaneo' });
    }

    const esEntrada = !acceso.QR_Entrada;
    const campo = esEntrada ? 'QR_Entrada' : 'QR_Salida';
    const estado = esEntrada ? 'Entrada registrada' : 'Finalizado';
    await connection.beginTransaction();
    enTransaccion = true;
    const [resultado] = await connection.query(
      `UPDATE Accesos_Externos
       SET ${campo} = NOW(), Estado_Actual = ?,
           Hora_Ingreso = IF(? = 'Entrada registrada', CURRENT_TIME(), Hora_Ingreso),
           Hora_Salida = IF(? = 'Finalizado', CURRENT_TIME(), Hora_Salida)
       WHERE ID_Acceso = ? AND ${campo} IS NULL AND Estado_Actual = ?`,
      [estado, estado, estado, acceso.ID_Acceso, acceso.Estado_Actual]
    );
    if (!resultado.affectedRows) {
      if (enTransaccion) { await connection.rollback(); enTransaccion = false; }
      return res.status(409).json({ msg: 'El escaneo ya fue registrado, intenta nuevamente' });
    }
    await connection.commit();
    enTransaccion = false;
    await auditar(registrarReporteAcceso, {
      usuarioId: req.user.id, usuarioNombre: req.user.nombre,
      accion: esEntrada ? 'ENTRADA_QR' : 'SALIDA_QR', idAcceso: acceso.ID_Acceso,
      estadoAnterior: acceso.Estado_Actual, estadoNuevo: estado,
      detalles: { escaneo: esEntrada ? 'ENTRADA' : 'SALIDA', numero_acompanantes: acompanantesQr }
    });
    return res.json({
      success: true,
      escaneos: esEntrada ? 1 : 2,
      restantes: esEntrada ? 1 : 0,
      estado,
      numeroAcompanantes: acompanantesQr,
      acceso: { ID_Acceso: acceso.ID_Acceso, Estado_Actual: estado, [campo]: new Date().toISOString() },
    });
  } catch (error) {
    if (enTransaccion) await connection.rollback();
    return res.status(500).json({ msg: 'Error al verificar QR de acceso externo' });
  } finally {
    connection.release();
  }
};

const verificarQRTransporte = async (req, res) => {
  const connection = await pool.getConnection();
  let enTransaccion = false;
  try {
    if (!req.user?.id) return res.status(401).json({ msg: 'Autenticación requerida' });
    const { token_qr } = req.body;
    if (!token_qr) return res.status(400).json({ msg: 'El código QR es obligatorio' });
    const [rows] = await connection.query(
      `SELECT
        t.ID_Traslado,
        t.Tipo_Traslado,
        t.Estado_Actual,
        t.QR_Token,
        t.QR_Salida,
        t.QR_Entrada,
        t.Km_Inicial,
        po.DESCRIPCION AS origen,
        pd.DESCRIPCION AS destino,
        col.NOMBRE AS solicitante

      FROM Traslados_Personal t

      LEFT JOIN Ubicaciones po
        ON po.ID_UBICACIONES = t.ID_Ubicacion_Origen

      LEFT JOIN Ubicaciones pd
        ON pd.ID_UBICACIONES = t.ID_Ubicacion_Destino

      LEFT JOIN Colaboradores col
        ON col.ID_COLABORADOR = t.ID_Solicitante

      WHERE t.QR_Token = ?`,
      [token_qr]
    );


    if (!rows.length) return res.status(404).json({ msg: 'Código QR de transporte no encontrado' });
    const traslado = rows[0];
    if (traslado.QR_Entrada) {
      return res.status(400).json({ msg: 'Este código QR ya fue escaneado en salida y entrada' });
    }
    if (traslado.Estado_Actual !== 'Aprobado' && traslado.Estado_Actual !== 'En camino') {
      return res.status(400).json({ msg: 'El traslado no está disponible para escaneo' });
    }

    const esSalida = !traslado.QR_Salida;
    const campo = esSalida ? 'QR_Salida' : 'QR_Entrada';
    const estado = esSalida
      ? 'En camino'
      : traslado.Tipo_Traslado === 'EMPRESARIAL'
        ? 'Finalizado'
        : traslado.Tipo_Traslado === 'PERSONAL'
          ? 'Pendiente KM final'
          : 'Pendiente factura';

    // En la salida de un traslado PERSONAL, garita registra el KM inicial del vehículo.
    // Si aún no lo envía, se responde sin registrar nada para que el escáner lo pida.
    const esSalidaPersonal = esSalida && traslado.Tipo_Traslado === 'PERSONAL';
    let kmInicial = null;
    if (esSalidaPersonal) {
      const { km_inicial } = req.body;
      if (km_inicial === undefined || km_inicial === null || km_inicial === '') {
        return res.json({
          success: true,
          requiereKmInicial: true,
          escaneos: 0,
          traslado: {
            ID_Traslado: traslado.ID_Traslado,
            origen: traslado.origen,
            destino: traslado.destino,
            solicitante: traslado.solicitante,
          },
        });
      }
      kmInicial = Number(km_inicial);
      if (!Number.isFinite(kmInicial) || kmInicial < 0) {
        return res.status(400).json({ msg: 'El KM inicial debe ser un número mayor o igual a 0' });
      }
    }

    await connection.beginTransaction();
    enTransaccion = true;
    const [resultado] = await connection.query(
      `UPDATE Traslados_Personal
       SET ${campo} = NOW(), Estado_Actual = ?, Km_Inicial = COALESCE(?, Km_Inicial),
           Hora_Llegada = IF(? = 'Finalizado', CURRENT_TIME(), Hora_Llegada)
       WHERE ID_Traslado = ? AND ${campo} IS NULL AND Estado_Actual = ?`,
      [estado, kmInicial, estado, traslado.ID_Traslado, traslado.Estado_Actual]
    );
    if (!resultado.affectedRows) {
      await connection.rollback(); enTransaccion = false;
      return res.status(409).json({ msg: 'El escaneo ya fue registrado, intenta nuevamente' });
    }
    await connection.commit();
    enTransaccion = false;
    await auditar(registrarReporteTraslado, {
      usuarioId: req.user.id, usuarioNombre: req.user.nombre,
      accion: esSalida ? 'SALIDA_QR' : 'LLEGADA_QR', idTraslado: traslado.ID_Traslado,
      estadoAnterior: traslado.Estado_Actual, estadoNuevo: estado,
      detalles: {
        escaneo: esSalida ? 'SALIDA' : 'ENTRADA',
        ...(esSalidaPersonal ? { km_inicial: kmInicial } : {}),
      }
    });

    return res.json({
      success: true,
      escaneos: esSalida ? 1 : 2,
      restantes: esSalida ? 1 : 0,
      estado,
      requiereKmFinal: !esSalida && traslado.Tipo_Traslado === 'PERSONAL',
      requiereFactura: !esSalida && traslado.Tipo_Traslado === 'PRIVADO',
      traslado: {
        ...traslado,
        ...(esSalidaPersonal ? { Km_Inicial: kmInicial } : {}),
        [campo]: new Date().toISOString(),
        Estado_Actual: estado,
      },
    });
  } catch (error) {
    if (enTransaccion) await connection.rollback();
    return res.status(500).json({ msg: 'Error al verificar QR de transporte' });
  } finally {
    connection.release();
  }
};

const verificarQRPaquetería = async (req, res) => {
  const connection = await pool.getConnection();
  let enTransaccion = false;
  try {
    if (!req.user?.id) return res.status(401).json({ msg: 'Autenticación requerida' });
    const { token_qr } = req.body;
    const [rows] = await connection.query(
      `SELECT
        e.ID_Paquete,
        e.Estado_Actual,
        e.QR_Salida,
        e.QR_Llegada,
        e.Fecha_Salida AS fecha_salida,
        e.Hora_Entrega AS hora_entrega,
        e.Tipo_Contenido AS tipo_contenido,

        po.DESCRIPCION AS lugar_origen,
        ao.AREA AS departamento_origen,
        resp.NOMBRE AS responsable_origen,

        pd.DESCRIPCION AS lugar_destino,
        ad.AREA AS departamento_destino,
        dest.NOMBRE AS responsable_destino

      FROM Envios_Paqueteria e

      INNER JOIN Ubicaciones po
        ON po.ID_UBICACIONES = e.ID_Ubicacion_Origen

      INNER JOIN Areas ao
        ON ao.ID_AREAS = e.ID_Area_Origen

      INNER JOIN Colaboradores resp
        ON resp.ID_COLABORADOR = e.ID_Responsable

      INNER JOIN Ubicaciones pd
        ON pd.ID_UBICACIONES = e.ID_Ubicacion_Destino

      INNER JOIN Areas ad
        ON ad.ID_AREAS = e.ID_Area_Destino

      INNER JOIN Colaboradores dest
        ON dest.ID_COLABORADOR = e.ID_Destinatario

      WHERE e.QR_Token = ?`,
      [token_qr]
    );


    if (!rows.length) {
      return res.status(404).json({ msg: 'Código QR no encontrado' });
    }

    const envio = rows[0];

    // 🔴 Ya se usó las 2 veces permitidas
    if (envio.QR_Salida && envio.QR_Llegada) {
      return res.status(400).json({
        msg: 'Este código QR ya fue escaneado en salida y llegada. No puede usarse de nuevo.',
      });
    }

    const esPrimerEscaneo = !envio.QR_Salida;
    const tipoEscaneo = esPrimerEscaneo ? 'SALIDA' : 'LLEGADA';

    // 🕒 Cooldown anti-duplicado SOLO contra el mismo intento reciente
    // (no bloquea salida → llegada, aunque pase 1 segundo entre ellas)
    const claveIntento = `${envio.ID_Paquete}:${tipoEscaneo}`;
    const ahora = Date.now();
    const ultimoIntento = intentosRecientes.get(claveIntento);

    if (ultimoIntento && ahora - ultimoIntento < MINUTOS_COOLDOWN * 60 * 1000) {
      const restantesMin = Math.ceil(
        (MINUTOS_COOLDOWN * 60 * 1000 - (ahora - ultimoIntento)) / 1000 / 60
      );
      return res.status(429).json({
        msg: `Escaneo duplicado detectado. Espera ${restantesMin} minuto(s) antes de reintentar.`,
        cooldown: true,
        minutosRestantes: restantesMin,
      });
    }

    // Registrar el intento ANTES de procesar (para bloquear rebotes)
    intentosRecientes.set(claveIntento, ahora);

    // 🧹 Limpieza ocasional para no crecer infinitamente
    if (intentosRecientes.size > 500) {
      const limite = ahora - MINUTOS_COOLDOWN * 60 * 1000;
      for (const [key, ts] of intentosRecientes.entries()) {
        if (ts < limite) intentosRecientes.delete(key);
      }
    }

    const campoActualizar = esPrimerEscaneo ? 'QR_Salida' : 'QR_Llegada';
    const nuevoEstado = esPrimerEscaneo ? 'En camino' : 'Finalizado';

    await connection.beginTransaction();
    enTransaccion = true;

    const [resultado] = await connection.query(
      `UPDATE Envios_Paqueteria
       SET ${campoActualizar} = NOW(), Estado_Actual = ?
       WHERE ID_Paquete = ? AND ${campoActualizar} IS NULL AND Estado_Actual = ?`,
      [nuevoEstado, envio.ID_Paquete, envio.Estado_Actual]
    );

    if (!resultado.affectedRows) {
      await connection.rollback(); enTransaccion = false;
      intentosRecientes.delete(claveIntento);
      return res.status(409).json({ msg: 'El escaneo ya fue registrado, intenta nuevamente' });
    }
    await connection.commit();
    enTransaccion = false;
    intentosRecientes.delete(claveIntento);
    await auditar(registrarReporteEnvio, {
      usuarioId: req.user.id, usuarioNombre: req.user.nombre,
      accion: esPrimerEscaneo ? 'SALIDA_QR' : 'LLEGADA_QR', idPaquete: envio.ID_Paquete,
      estadoAnterior: envio.Estado_Actual, estadoNuevo: nuevoEstado,
      detalles: {
        [campoActualizar]: new Date().toISOString(),
      },
    });

    // El bloqueo se libera después del commit.

    if (!esPrimerEscaneo) {
      try {
      await notificarLlegadaPedido({
        fecha_salida: envio.fecha_salida,
        tipo_contenido: envio.tipo_contenido,
        planta_origen: envio.lugar_origen,
        area_origen: envio.departamento_origen,
        responsable_origen: envio.responsable_origen,
        planta_destino: envio.lugar_destino,
        area_destino: envio.departamento_destino,
        responsable_destino: envio.responsable_destino,
      });
      } catch (error) { console.error('Notificación de llegada fallida:', error.code || 'ERROR'); }
    }

    return res.json({
      success: true,
      msg: esPrimerEscaneo
        ? 'Salida registrada (1/2). Falta escanear en destino.'
        : 'Llegada registrada (2/2). Envío finalizado.',
      escaneos: esPrimerEscaneo ? 1 : 2,
      restantes: esPrimerEscaneo ? 1 : 0,
      estado: nuevoEstado,
      envio,
    });
  } catch (error) {
    if (enTransaccion) await connection.rollback();
    if (typeof claveIntento !== 'undefined') intentosRecientes.delete(claveIntento);
    return res.status(500).json({ msg: 'Error al verificar QR' });
  } finally {
    connection.release();
  }
};

export { verificarQRPaquetería, verificarQRTransporte, verificarQRExterno };