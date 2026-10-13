import jwt from "jsonwebtoken"
import pool from "../database.js"

const crearTokenJWT = (id, rol, nombre) => {
    return jwt.sign({ id, rol, nombre }, process.env.JWT_SECRET, { expiresIn: "8h" })
}

const verificarTokenJWT = async (req, res, next) => {
	const { authorization } = req.headers
    if (!authorization) return res.status(401).json({ msg: "Acceso denegado: token no proporcionado" })
    try {
        const [scheme, value] = authorization.trim().split(/\s+/)
        const token = scheme?.toLowerCase() === 'bearer' ? value : authorization.trim()
        if (!token) return res.status(401).json({ msg: "Acceso denegado: token inválido" })
        const { id, rol } = jwt.verify(token, process.env.JWT_SECRET)
        
        // Obtener datos del colaborador desde la base de datos
        const [rows] = await pool.query(`
            SELECT col.*, usu.rol AS ROL, usu.estado AS USUARIO_ESTADO
            FROM Colaboradores col
            INNER JOIN usuarios usu ON usu.cedula = col.CEDULA
            WHERE col.ID_COLABORADOR = ?
        `, [id])
        
        if (rows.length === 0) return res.status(401).json({ msg: "Usuario no encontrado" })
        
        // Normalizar propiedades para que el resto del backend
        // use nombres consistentes (lowercase) sin acoplarse
        // a los nombres de columna de la BD.
        const col = rows[0]
        req.user = {
            id: col.ID_COLABORADOR,
            nombre: col.NOMBRE,
            cedula: col.CEDULA,
            email: col.EMAIL_CORPORATIVO,
            rol: col.ROL,
            estado: col.USUARIO_ESTADO || col.ESTADO,
        }
        req.user.rolDesdeToken = rol
        next()
    } catch (error) {
        console.log(error)
        return res.status(401).json({ msg: `Token inválido o expirado - ${error.message}` })
    }
}

export {
    crearTokenJWT,
    verificarTokenJWT
}
