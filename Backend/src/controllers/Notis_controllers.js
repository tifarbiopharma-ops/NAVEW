
import pool from "../database.js";
import { notificarLlegadaCamion } from "../telegram/telegramService.js";

const obtenerSupervisor = async (idColaborador) => {
  const [rows] = await pool.query(
    `SELECT
       c.ID_COLABORADOR AS id,
       c.NOMBRE AS nombre,
       c.UBICACION AS ubicacionId,
       u.DESCRIPCION AS ubicacionNombre
     FROM Colaboradores c
     LEFT JOIN Ubicaciones u
       ON u.ID_UBICACIONES = c.UBICACION
     WHERE c.ID_COLABORADOR = ?
     LIMIT 1`,
    [idColaborador]
  );

  return rows[0] || null;
};

const obtenerDatosAvisoLlegada = async (req, res) => {
  try {
    const idColaborador = req.user?.idColaborador;

    if (!idColaborador) {
      return res.status(401).json({
        msg: "Usuario no autenticado."
      });
    }

    const [ubicaciones] = await pool.query(
      `SELECT
         ID_UBICACIONES AS id,
         DESCRIPCION AS nombre
       FROM Ubicaciones
       ORDER BY DESCRIPCION`
    );

    const supervisor = await obtenerSupervisor(idColaborador);

    if (!supervisor) {
      return res.status(404).json({
        msg: "No se encontró al colaborador."
      });
    }

    return res.status(200).json({
      ubicacionActual: supervisor.ubicacionId,
      ubicaciones
    });
  } catch (error) {
    console.error("Error cargando ubicaciones:", error);

    return res.status(500).json({
      msg: "No se pudieron cargar las ubicaciones."
    });
  }
};

const enviarAvisoLlegada = async (req, res) => {
  try {
    const idColaborador = req.user?.idColaborador;
    const rol = String(req.user?.rol || "")
      .trim()
      .toLowerCase();

    if (!idColaborador) {
      return res.status(401).json({
        msg: "Usuario no autenticado."
      });
    }

    if (rol !== "supervisor") {
      return res.status(403).json({
        msg: "Solo los supervisores pueden enviar este aviso."
      });
    }

    const idUbicacion = Number(req.body?.idUbicacion);

    if (!Number.isSafeInteger(idUbicacion) || idUbicacion <= 0) {
      return res.status(400).json({
        msg: "Selecciona una planta válida."
      });
    }

    const supervisor = await obtenerSupervisor(idColaborador);

    if (!supervisor) {
      return res.status(404).json({
        msg: "No se encontró al supervisor."
      });
    }

    const [ubicaciones] = await pool.query(
      `SELECT DESCRIPCION AS nombre
       FROM Ubicaciones
       WHERE ID_UBICACIONES = ?
       LIMIT 1`,
      [idUbicacion]
    );

    if (!ubicaciones.length) {
      return res.status(404).json({
        msg: "La planta seleccionada no existe."
      });
    }

    await notificarLlegadaCamion({
      planta: ubicaciones[0].nombre,
      supervisor: supervisor.nombre
    });

    return res.status(200).json({
      msg: "Aviso de llegada enviado correctamente."
    });
  } catch (error) {
    console.error("Error enviando aviso de llegada:", error);

    return res.status(502).json({
      msg: "No se pudo enviar la notificación a Telegram."
    });
  }
};

export {
  obtenerDatosAvisoLlegada,
  enviarAvisoLlegada
};