import bcryptjs from 'bcryptjs';
import pool from '../database.js';
import { crearTokenJWT } from '../middlewares/JWT.js';
import { registrarReporteUsuario } from '../utils/reportesUsuarios.js';

// Sistema de protección contra fuerza bruta
const loginAttempts = new Map();
const MAX_INTENTOS = 3; // Después de 3 intentos, la cuenta se bloquea permanentemente

const registrarIntento = (email) => {
  if (!loginAttempts.has(email)) {
    loginAttempts.set(email, 0);
  }
  const intentos = loginAttempts.get(email);
  loginAttempts.set(email, intentos + 1);
};

const obtenerIntentosFallidos = (email) => {
  return loginAttempts.get(email) || 0;
};

const limpiarIntentosLogin = (email) => {
  loginAttempts.delete(email);
};

const formatearUsuarioParaAuditoria = (usuario = {}) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  cedula: usuario.cedula,
  email: usuario.email,
  rol: usuario.rol,
  estado: usuario.estado,
});

// Login de usuario - NO REQUIERE ROL
  const login = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({ msg: "Email y contraseña son requeridos" });
    }

    const emailLower = email.toLowerCase();

    // Buscar usuario por email
    const [usuarios] = await connection.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [emailLower]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ msg: "Email o contraseña incorrectos" });
    }

    const usuario = usuarios[0];

    // Verificar si la cuenta está bloqueada
    if (usuario.estado === 'bloqueado') {
      return res.status(403).json({ 
        msg: "Tu cuenta está bloqueada. Por favor contacta al administrador para desbloquearla." 
      });
    }

    // Verificar contraseña
    const passwordValida = await bcryptjs.compare(password, usuario.password);
    if (!passwordValida) {
      const intentosActuales = obtenerIntentosFallidos(emailLower);
      registrarIntento(emailLower);
      const nuevoConteo = intentosActuales + 1;

      // Si llega a 3 intentos fallidos, bloquear la cuenta de forma permanente
      if (nuevoConteo >= MAX_INTENTOS) {
        await connection.query(
          'UPDATE usuarios SET estado = ? WHERE id = ?',
          ['bloqueado', usuario.id]
        );
        limpiarIntentosLogin(emailLower);
        return res.status(403).json({ 
          msg: "Tu cuenta ha sido bloqueada por seguridad. Por favor contacta al administrador." 
        });
      }

      const intentosRestantes = MAX_INTENTOS - nuevoConteo;
      return res.status(401).json({ 
        msg: `Email o contraseña incorrectos. Tienes ${intentosRestantes} intento(s) restante(s) antes de que tu cuenta se bloquee.` 
      });
    }

    // Login exitoso - limpiar intentos de sesión
    limpiarIntentosLogin(emailLower);

    // Generar token JWT
    const token = crearTokenJWT(usuario.id, usuario.rol);

    return res.status(200).json({
      msg: "Login exitoso",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ msg: 'Ocurrió un error en el servidor', error: err.message });
  } finally {
    connection.release();
  }
};

// Obtener mi perfil - REQUIERE AUTENTICACIÓN
  const obtenerMiPerfil = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // El usuario autenticado viene en req.user desde el middleware
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ msg: 'No autenticado' });
    }

    const [usuarios] = await connection.query(
      'SELECT id, nombre, cedula, email, rol, estado, created_at FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    return res.status(200).json({
      msg: "Perfil obtenido exitosamente",
      usuario: usuarios[0]
    });

  } catch (err) {
    console.error('Error obteniendo perfil:', err);
    return res.status(500).json({ msg: 'Ocurrió un error en el servidor', error: err.message });
  } finally {
    connection.release();
  }
};


// Registro de usuario - ROL ADMINISTRADOR
  const registro = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // Validar que el usuario sea administrador
    if (req.user?.rol !== 'administrador') {
      return res.status(403).json({ 
        msg: 'Acceso denegado: solo administradores pueden registrar nuevos usuarios' 
      });
    }

    const { email, password, nombre, cedula, rol } = req.body;
    const rolesPermitidos = ['administrador', 'jefe', 'solicitante', 'supervisor'];

    // Validar que todos los campos requeridos estén presentes
    if (!email || !password || !nombre || !cedula || !rol) {
      return res.status(400).json({ msg: "Debes llenar todos los campos requeridos: email, password, nombre, cedula, rol" });
    }

    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ msg: 'El rol solo puede ser: administrador, jefe, solicitante o supervisor' });
    }

    // Validar que el email pertenezca a uno de los dominios permitidos
    const emailLower = email.toString().toLowerCase();
    const dominiosValidos = ["@farbiopharma.com", "@inpel.com"];
    const dominioValido = dominiosValidos.some(dominio => emailLower.endsWith(dominio));
    
    if (!dominioValido) {
      return res.status(400).json({ msg: `El correo debe pertenecer a uno de estos dominios: ${dominiosValidos.join(" o ")}` });
    }

    // Validar que la contraseña tenga al menos 14 caracteres
    if (password.length < 14) {
      return res.status(400).json({ msg: "La contraseña debe tener al menos 14 caracteres" });
    }

    // Validar que la cédula sea válida y tenga 10 dígitos
    if (!/^\d{10}$/.test(cedula)) {
      return res.status(400).json({ msg: "La cédula debe tener exactamente 10 dígitos" });
    }

    // Verificar que el email no esté registrado
    const [emailExistente] = await connection.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [emailLower]
    );
    if (emailExistente.length > 0) {
      return res.status(400).json({ msg: "El email ya se encuentra registrado" });
    }

    // Verificar que la cédula no esté registrada
    const [cedulaExistente] = await connection.query(
      'SELECT * FROM usuarios WHERE cedula = ?',
      [cedula]
    );
    if (cedulaExistente.length > 0) {
      return res.status(400).json({ msg: "La cédula ya está registrada" });
    }


    // Encriptar contraseña
    const passwordEncriptada = await bcryptjs.hash(password, 10);

    // Insertar el nuevo usuario en la base de datos (estado predeterminado: activo)
    const [result] = await connection.query(
      'INSERT INTO usuarios (nombre, cedula, email, password, rol, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, cedula, emailLower, passwordEncriptada, rol, 'activo']
    );

    const usuarioCreado = formatearUsuarioParaAuditoria({
      id: result.insertId,
      nombre,
      cedula,
      email: emailLower,
      rol,
    });

    await registrarReporteUsuario({
      usuarioId: req.user?.id,
      usuarioNombre: req.user?.nombre,
      accion: 'crear_usuario',
      modulo: 'usuarios',
      campoAfectado: 'usuario',
      valorAnterior: null,
      valorNuevo: usuarioCreado,
      targetUserId: result.insertId,
      targetUserName: nombre,
    });

    return res.status(201).json({
      msg: "Usuario registrado exitosamente",
      usuario: {
        id: result.insertId,
        nombre,
        cedula,
        email: emailLower,
        rol,
        estado: 'activo'
      }
    });

  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ msg: 'Ocurrió un error en el servidor', error: err.message });
  } finally {
    connection.release();
  }
};

// Obtener todos los usuarios - REQUIERE ROL ADMINISTRADOR
  const obtenerUsuarios = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Validar que el usuario sea administrador
    if (req.user?.rol !== 'administrador') {
      return res.status(403).json({ 
        msg: 'Acceso denegado: solo administradores pueden obtener la lista de usuarios' 
      });
    }

    const [usuarios] = await connection.query('SELECT id, nombre, cedula, email, rol, estado, created_at FROM usuarios');

    return res.status(200).json({
      msg: "Usuarios obtenidos exitosamente",
      usuarios
    });

  } catch (err) {
    console.error('Error obteniendo usuarios:', err);
    return res.status(500).json({ msg: 'Ocurrió un error en el servidor', error: err.message });
  } finally {
    connection.release();
  }
};

// Obtener usuario por ID - REQUIERE ROL ADMINISTRADOR
  const obtenerUsuario = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Validar que el usuario sea administrador
    if (req.user?.rol !== 'administrador') {
      return res.status(403).json({ 
        msg: 'Acceso denegado: solo administradores pueden obtener datos de usuarios' 
      });
    }

    const { id } = req.params;

    const [usuarios] = await connection.query(
      'SELECT id, nombre, cedula, email, rol, estado, created_at FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    return res.status(200).json({
      msg: "Usuario obtenido exitosamente",
      usuario: usuarios[0]
    });

  } catch (err) {
    console.error('Error obteniendo usuario:', err);
    return res.status(500).json({ msg: 'Ocurrió un error en el servidor', error: err.message });
  } finally {
    connection.release();
  }
};


// Actualizar usuario - REQUIERE ROL ADMINISTRADOR
  const actualizarUsuario = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { nombre, cedula, email, rol, password, estado } = req.body;
    const rolesPermitidos = ['administrador', 'jefe', 'solicitante', 'supervisor'];

    if (rol && !rolesPermitidos.includes(rol)) {
      return res.status(400).json({ msg: 'El rol solo puede ser: administrador, jefe, solicitante o supervisor' });
    }

    // Validar que el usuario exista
    const [usuarioExistente] = await connection.query(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarioExistente.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const usuarioAntes = formatearUsuarioParaAuditoria(usuarioExistente[0]);

    // Preparar datos a actualizar
    const actualizaciones = {};
    if (nombre) actualizaciones.nombre = nombre;
    if (cedula) actualizaciones.cedula = cedula;
    if (email) actualizaciones.email = email.toLowerCase();
    if (rol) actualizaciones.rol = rol;
    if (estado && (estado === 'activo' || estado === 'bloqueado')) {
      actualizaciones.estado = estado;
    }

    if (password) {
      actualizaciones.password = await bcryptjs.hash(password, 10);
    }

    // Si no hay cambios
    if (Object.keys(actualizaciones).length === 0) {
      return res.status(400).json({ msg: "No hay campos para actualizar" });
    }

    // Construir query dinámicamente
    const campos = Object.keys(actualizaciones).map(key => `${key} = ?`).join(', ');
    const valores = [...Object.values(actualizaciones), id];

    await connection.query(
      `UPDATE usuarios SET ${campos}, updated_at = NOW() WHERE id = ?`,
      valores
    );

    // Si se cambia el estado a activo, limpiar intentos de sesión
    if (actualizaciones.estado === 'activo') {
      const emailUsuario = usuarioExistente[0].email.toLowerCase();
      limpiarIntentosLogin(emailUsuario);
    }

    const usuarioDespues = {
      ...usuarioAntes,
      nombre: actualizaciones.nombre ?? usuarioAntes.nombre,
      cedula: actualizaciones.cedula ?? usuarioAntes.cedula,
      email: actualizaciones.email ?? usuarioAntes.email,
      rol: actualizaciones.rol ?? usuarioAntes.rol,
      estado: actualizaciones.estado ?? usuarioAntes.estado,
      ...(actualizaciones.password ? { password: 'actualizada' } : {}),
    };

    await registrarReporteUsuario({
      usuarioId: req.user?.id,
      usuarioNombre: req.user?.nombre,
      accion: 'editar_usuario',
      modulo: 'usuarios',
      campoAfectado: Object.keys(actualizaciones).join(', ') || 'usuario',
      valorAnterior: {
        ...usuarioAntes,
        ...(actualizaciones.password ? { password: 'actualizada' } : {}),
      },
      valorNuevo: usuarioDespues,
      targetUserId: Number(id),
      targetUserName: usuarioDespues.nombre,
    });

    return res.status(200).json({
      msg: "Usuario actualizado exitosamente",
      usuario: { 
        id, 
        nombre: actualizaciones.nombre || usuarioExistente[0].nombre, 
        cedula: actualizaciones.cedula || usuarioExistente[0].cedula,
        email: actualizaciones.email || usuarioExistente[0].email, 
        rol: actualizaciones.rol || usuarioExistente[0].rol,
        estado: actualizaciones.estado || usuarioExistente[0].estado
      }
    });

  } catch (err) {
    console.error('Error actualizando usuario:', err);
    return res.status(500).json({ msg: 'Ocurrió un error en el servidor', error: err.message });
  } finally {
    connection.release();
  }
};

// Eliminar usuario - REQUIERE ROL ADMINISTRADOR
  const eliminarUsuario = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Validar que el usuario sea administrador
    if (req.user?.rol !== 'administrador') {
      return res.status(403).json({ 
        msg: 'Acceso denegado: solo administradores pueden eliminar usuarios' 
      });
    }

    const { id } = req.params;

    const [usuarioExistente] = await connection.query(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarioExistente.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const usuarioAntes = formatearUsuarioParaAuditoria(usuarioExistente[0]);

    const [resultado] = await connection.query(
      'DELETE FROM usuarios WHERE id = ?',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    await registrarReporteUsuario({
      usuarioId: req.user?.id,
      usuarioNombre: req.user?.nombre,
      accion: 'eliminar_usuario',
      modulo: 'usuarios',
      campoAfectado: 'usuario',
      valorAnterior: usuarioAntes,
      valorNuevo: null,
      targetUserId: Number(id),
      targetUserName: usuarioAntes.nombre,
    });

    return res.status(200).json({ msg: "Usuario eliminado exitosamente" });

  } catch (err) {
    console.error('Error eliminando usuario:', err);
    return res.status(500).json({ msg: 'Ocurrió un error en el servidor', error: err.message });
  } finally {
    connection.release();
  }
};

export { login, obtenerMiPerfil, registro, obtenerUsuarios, obtenerUsuario, actualizarUsuario, eliminarUsuario };