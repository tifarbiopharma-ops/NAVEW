import jwt from "jsonwebtoken";
import pool from "../database.js";

const crearTokenJWT = (id, rol) => {
  return jwt.sign(
    { id, rol },
    process.env.JWT_SECRET,
    {
      expiresIn: "8h",
      algorithm: "HS256"
    }
  );
};

const verificarTokenJWT = async (req, res, next) => {
  try {
    // 1. Validar encabezado Authorization
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        msg: "Acceso denegado: token no proporcionado"
      });
    }

    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({
        msg: "Formato de autorización inválido"
      });
    }

    const token = match[1];

    // 2. Verificar firma y expiración
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    if (!Number.isSafeInteger(decoded.id) || decoded.id <= 0) {
      return res.status(401).json({
        msg: "Token inválido"
      });
    }

    // 3. Consultar solamente los campos necesarios
    const [usuarios] = await pool.query(
      `SELECT
          usu.id,
          usu.cedula,
          usu.email,
          usu.rol,
          usu.estado,
          col.ID_COLABORADOR,
          col.NOMBRE
       FROM usuarios usu
       LEFT JOIN Colaboradores col
         ON col.CEDULA = usu.cedula
       WHERE usu.id = ?
       LIMIT 1`,
      [decoded.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        msg: "Usuario no encontrado"
      });
    }

    const usuario = usuarios[0];

    // 4. Validar estado de cuenta
    if (usuario.estado !== "activo") {
      return res.status(403).json({
        msg: "Cuenta inactiva o bloqueada"
      });
    }

    // 5. Exponer solo información autorizada
    // Este objeto permanece en el servidor.
    req.user = {
      id: usuario.id,
      idColaborador: usuario.ID_COLABORADOR ?? null,
      nombre: usuario.NOMBRE ?? null,
      cedula: usuario.cedula,
      email: usuario.email,
      rol: usuario.rol,
      estado: usuario.estado
    };

    next();

  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return res.status(401).json({
        msg: "Token inválido o expirado"
      });
    }

    console.error("Error interno verificando JWT:", error);

    return res.status(500).json({
      msg: "Error interno de autenticación"
    });
  }
};

export {
  crearTokenJWT,
  verificarTokenJWT
};
