import jwt from "jsonwebtoken"
import pool from "../database.js"

const crearTokenJWT = (id, rol) => {
    return jwt.sign({ id, rol }, process.env.JWT_SECRET, { expiresIn: "8h" })
}

const verificarTokenJWT = async (req, res, next) => {
	const { authorization } = req.headers
    if (!authorization) return res.status(401).json({ msg: "Acceso denegado: token no proporcionado" })
    try {
        const token = authorization.split(" ")[1]
        const { id, rol } = jwt.verify(token, process.env.JWT_SECRET)
        
        // Obtener datos del usuario desde la base de datos
        const [usuarios] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id])
        
        if (usuarios.length === 0) return res.status(401).json({ msg: "Usuario no encontrado" })
        
        req.user = usuarios[0]
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

