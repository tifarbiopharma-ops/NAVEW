const MINUTOS_COOLDOWN = 5; // 5 minutos anti-duplicado (mismo escaneo)
const intentosRecientes = new Map(); // idPaquete -> timestamp del último intento

const verificarQRPaquetería = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { token_qr } = req.body;

    const [rows] = await connection.query(
      `SELECT ID_Paquete, Estado_Actual, QR_Salida, QR_Llegada
       FROM Envios_Paqueteria
       WHERE QR_Token = ?`,
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
    const nuevoEstado = esPrimerEscaneo ? 'ESCANEADO_ORIGEN' : 'FINALIZADO';

    await connection.beginTransaction();

    await connection.query(
      `UPDATE Envios_Paqueteria
       SET ${campoActualizar} = NOW(), Estado_Actual = ?
       WHERE ID_Paquete = ?`,
      [nuevoEstado, envio.ID_Paquete]
    );

    await registrarEvento(connection, envio.ID_Paquete, nuevoEstado, req.user.id, {
      escaneo: tipoEscaneo,
    });

    await connection.commit();

    // ✅ Escaneo exitoso: liberar el bloqueo para permitir el siguiente tipo
    intentosRecientes.delete(claveIntento);

    return res.json({
      success: true,
      msg: esPrimerEscaneo
        ? 'Salida registrada (1/2). Falta escanear en destino.'
        : 'Llegada registrada (2/2). Envío finalizado.',
      escaneos: esPrimerEscaneo ? 1 : 2,
      restantes: esPrimerEscaneo ? 1 : 0,
      estado: nuevoEstado,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ msg: 'Error al verificar QR', error: error.message });
  } finally {
    connection.release();
  }
};

export { verificarQRPaquetería };