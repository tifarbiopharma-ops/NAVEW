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
  id: usuario.ID_COLABORADOR,
  nombre: usuario.NOMBRE,
  cedula: usuario.CEDULA,
  email: usuario.EMAIL_CORPORATIVO,
  rol: usuario.ROL,
  estado: usuario.ESTADO,
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

    // Buscar colaborador por email corporativo
    const [colaboradores] = await connection.query(
      `SELECT col.*, usu.password AS password_hash, usu.rol AS ROL, usu.estado AS USUARIO_ESTADO
       FROM usuarios usu
       INNER JOIN Colaboradores col ON col.CEDULA = usu.cedula
       WHERE usu.email = ?`,
      [emailLower]
    );

    if (colaboradores.length === 0) {
      return res.status(401).json({ msg: "Email o contraseña incorrectos" });
    }

    const usuario = colaboradores[0];

    if (!usuario.password_hash) {
      console.error(`El colaborador ${usuario.ID_COLABORADOR} no tiene una contraseña configurada`);
      return res.status(401).json({ msg: "Email o contraseña incorrectos" });
    }

    // Verificar si la cuenta está bloqueada
    if (usuario.USUARIO_ESTADO === 'bloqueado' || usuario.ESTADO === 'BLOQUEADO') {
      return res.status(403).json({ 
        msg: "Tu cuenta está bloqueada. Por favor contacta al administrador para desbloquearla." 
      });
    }

    // Verificar contraseña
    const passwordValida = await bcryptjs.compare(password, usuario.password_hash);
    if (!passwordValida) {
      const intentosActuales = obtenerIntentosFallidos(emailLower);
      registrarIntento(emailLower);
      const nuevoConteo = intentosActuales + 1;

      // Si llega a 3 intentos fallidos, bloquear la cuenta de forma permanente
      if (nuevoConteo >= MAX_INTENTOS) {
        await connection.query(
          'UPDATE usuarios SET estado = ? WHERE cedula = ?',
          ['bloqueado', usuario.CEDULA]
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
    const token = crearTokenJWT(usuario.ID_COLABORADOR, usuario.ROL, usuario.NOMBRE);

    return res.status(200).json({
      msg: "Login exitoso",
      token,
      usuario: {
        id: usuario.ID_COLABORADOR,
        nombre: usuario.NOMBRE,
        email: usuario.EMAIL_CORPORATIVO,
        rol: usuario.ROL
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
    // El usuario autenticado viene en req.user desde el middleware (ya normalizado)
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ msg: 'No autenticado' });
    }

    const [colaboradores] = await connection.query(
      `SELECT col.ID_COLABORADOR, col.NOMBRE, col.CEDULA,
              COALESCE(usu.email, col.EMAIL_CORPORATIVO) AS EMAIL_CORPORATIVO,
              usu.rol AS ROL, usu.estado AS ESTADO, usu.created_at AS CREATED_AT
       FROM Colaboradores col
       LEFT JOIN usuarios usu ON usu.cedula = col.CEDULA
       WHERE col.ID_COLABORADOR = ?`,
      [usuarioId]
    );

    if (colaboradores.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    // Normalizar la respuesta para el frontend
    const col = colaboradores[0];
    return res.status(200).json({
      msg: "Perfil obtenido exitosamente",
      usuario: {
        id: col.ID_COLABORADOR,
        nombre: col.NOMBRE,
        cedula: col.CEDULA,
        email: col.EMAIL_CORPORATIVO,
        rol: col.ROL,
        estado: col.ESTADO,
        created_at: col.CREATED_AT,
      }
    });

  } catch (err) {
    console.error('Error obteniendo perfil:', err);
    return res.status(500).json({ msg: 'Ocurrió un error en el servidor', error: err.message });
  } finally {
    connection.release();
  }
};

// Buscar colaborador por cédula para la creación de usuarios
const obtenerColaboradorPorCedula = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    if (req.user?.rol !== 'administrador') {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    const { cedula } = req.params;
    const [colaboradores] = await connection.query(
      'SELECT ID_COLABORADOR, NOMBRE, CEDULA, EMAIL_CORPORATIVO AS email FROM Colaboradores WHERE CEDULA = ?',
      [cedula]
    );

    if (colaboradores.length === 0) {
      return res.status(404).json({ msg: 'No existe un colaborador con esa cédula' });
    }

    return res.status(200).json({ colaborador: colaboradores[0] });
  } catch (err) {
    console.error('Error buscando colaborador:', err);
    return res.status(500).json({ msg: 'Ocurrió un error en el servidor' });
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
      'SELECT id FROM usuarios WHERE email = ?',
      [emailLower]
    );
    if (emailExistente.length > 0) {
      return res.status(400).json({ msg: "El email ya se encuentra registrado" });
    }

    // Verificar que la cédula no esté registrada
    const [cedulaExistente] = await connection.query(
      'SELECT id FROM usuarios WHERE cedula = ?',
      [cedula]
    );
    if (cedulaExistente.length > 0) {
      return res.status(400).json({ msg: "La cédula ya está registrada" });
    }

    const [colaboradorExistente] = await connection.query(
      'SELECT ID_COLABORADOR, NOMBRE, CEDULA, EMAIL_CORPORATIVO FROM Colaboradores WHERE CEDULA = ?',
      [cedula]
    );

    if (colaboradorExistente.length === 0) {
      return res.status(404).json({ msg: "No existe un colaborador con esa cédula" });
    }

    const colaborador = colaboradorExistente[0];


    // Encriptar contraseña
    const passwordEncriptada = await bcryptjs.hash(password, 10);

    await connection.beginTransaction();

    await connection.query(
      'INSERT INTO usuarios (cedula, email, password, rol, estado) VALUES (?, ?, ?, ?, ?)',
      [cedula, emailLower, passwordEncriptada, rol, 'activo']
    );

    await connection.commit();

    const usuarioCreado = formatearUsuarioParaAuditoria({
      ID_COLABORADOR: colaborador.ID_COLABORADOR,
      NOMBRE: colaborador.NOMBRE,
      CEDULA: cedula,
      EMAIL_CORPORATIVO: emailLower,
      ROL: rol,
    });

    await registrarReporteUsuario({
      usuarioId: req.user?.id,
      usuarioNombre: req.user?.nombre,
      accion: 'crear_usuario',
      modulo: 'usuarios',
      campoAfectado: 'usuario',
      valorAnterior: null,
      valorNuevo: usuarioCreado,
      targetUserId: colaborador.ID_COLABORADOR,
      targetUserName: colaborador.NOMBRE,
    });

    return res.status(201).json({
      msg: "Usuario registrado exitosamente",
      usuario: {
        id: colaborador.ID_COLABORADOR,
        nombre: colaborador.NOMBRE,
        cedula,
        email: emailLower,
        rol,
        estado: 'ACTIVO'
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

    const [colaboradores] = await connection.query(
      `SELECT col.ID_COLABORADOR, col.NOMBRE, col.CEDULA,
              COALESCE(usu.email, col.EMAIL_CORPORATIVO) AS EMAIL_CORPORATIVO,
              usu.rol AS ROL, usu.estado AS ESTADO, usu.created_at AS CREATED_AT
       FROM Colaboradores col
       LEFT JOIN usuarios usu ON usu.cedula = col.CEDULA
       ORDER BY col.NOMBRE`
    );

    // Normalizar la respuesta para el frontend
    const usuarios = colaboradores.map(col => ({
      id: col.ID_COLABORADOR,
      nombre: col.NOMBRE,
      cedula: col.CEDULA,
      email: col.EMAIL_CORPORATIVO,
      rol: col.ROL,
      estado: col.ESTADO,
      created_at: col.CREATED_AT,
    }));

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

    const [colaboradores] = await connection.query(
      `SELECT col.ID_COLABORADOR, col.NOMBRE, col.CEDULA,
              COALESCE(usu.email, col.EMAIL_CORPORATIVO) AS EMAIL_CORPORATIVO,
              usu.rol AS ROL, usu.estado AS ESTADO, usu.created_at AS CREATED_AT
       FROM Colaboradores col
       LEFT JOIN usuarios usu ON usu.cedula = col.CEDULA
       WHERE col.ID_COLABORADOR = ?`,
      [id]
    );

    if (colaboradores.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const col = colaboradores[0];
    return res.status(200).json({
      msg: "Usuario obtenido exitosamente",
      usuario: {
        id: col.ID_COLABORADOR,
        nombre: col.NOMBRE,
        cedula: col.CEDULA,
        email: col.EMAIL_CORPORATIVO,
        rol: col.ROL,
        estado: col.ESTADO,
        created_at: col.CREATED_AT,
      }
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

    // Validar que el colaborador exista
    const [colaboradorExistente] = await connection.query(
      `SELECT col.*, usu.email AS USUARIO_EMAIL, usu.rol AS ROL, usu.estado AS USUARIO_ESTADO
       FROM Colaboradores col
       INNER JOIN usuarios usu ON usu.cedula = col.CEDULA
       WHERE col.ID_COLABORADOR = ?`,
      [id]
    );

    if (colaboradorExistente.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const usuarioAntes = formatearUsuarioParaAuditoria(colaboradorExistente[0]);

    // Preparar datos a actualizar
    const actualizaciones = {};
    if (nombre) actualizaciones.NOMBRE = nombre;
    if (cedula) actualizaciones.CEDULA = cedula;
    if (email) actualizaciones.email = email.toLowerCase();
    if (rol) actualizaciones.rol = rol;
    if (estado && ['activo', 'bloqueado', 'ACTIVO', 'BLOQUEADO'].includes(estado)) {
      actualizaciones.estado = estado.toLowerCase();
    }
    if (password) actualizaciones.password = await bcryptjs.hash(password, 10);

    // Si no hay cambios
    if (Object.keys(actualizaciones).length === 0) {
      return res.status(400).json({ msg: "No hay campos para actualizar" });
    }

    // Construir query dinámicamente
    const datosColaborador = {};
    if (nombre) datosColaborador.NOMBRE = nombre;
    if (cedula) datosColaborador.CEDULA = cedula;
    if (email) datosColaborador.EMAIL_CORPORATIVO = email.toLowerCase();

    await connection.beginTransaction();
    if (Object.keys(datosColaborador).length > 0) {
      const camposColaborador = Object.keys(datosColaborador).map(key => `${key} = ?`).join(', ');
      await connection.query(
        `UPDATE Colaboradores SET ${camposColaborador}, UPDATED_AT = NOW() WHERE ID_COLABORADOR = ?`,
        [...Object.values(datosColaborador), id]
      );
    }
    const datosUsuario = Object.fromEntries(
      Object.entries(actualizaciones).filter(([key]) => ['email', 'rol', 'estado', 'password'].includes(key))
    );
    if (cedula) datosUsuario.cedula = cedula;
    if (Object.keys(datosUsuario).length > 0) {
      const camposUsuario = Object.keys(datosUsuario).map(key => `${key} = ?`).join(', ');
      await connection.query(
        `UPDATE usuarios SET ${camposUsuario}, updated_at = NOW() WHERE cedula = ?`,
        [...Object.values(datosUsuario), colaboradorExistente[0].CEDULA]
      );
    }
    await connection.commit();

    // Si se cambia el estado a ACTIVO, limpiar intentos de sesión
    if (actualizaciones.estado === 'activo') {
      const emailUsuario = (colaboradorExistente[0].USUARIO_EMAIL || '').toLowerCase();
      limpiarIntentosLogin(emailUsuario);
    }

    const colaboradorDespues = {
      ...usuarioAntes,
      nombre: actualizaciones.NOMBRE ?? usuarioAntes.nombre,
      cedula: actualizaciones.CEDULA ?? usuarioAntes.cedula,
      email: actualizaciones.EMAIL_CORPORATIVO ?? usuarioAntes.email,
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
      valorNuevo: colaboradorDespues,
      targetUserId: Number(id),
      targetUserName: colaboradorDespues.nombre,
    });

    return res.status(200).json({
      msg: "Usuario actualizado exitosamente",
      usuario: { 
        id, 
        nombre: actualizaciones.NOMBRE || colaboradorExistente[0].NOMBRE, 
        cedula: actualizaciones.CEDULA || colaboradorExistente[0].CEDULA,
        email: actualizaciones.email || colaboradorExistente[0].USUARIO_EMAIL,
        rol: actualizaciones.rol || colaboradorExistente[0].ROL,
        estado: actualizaciones.estado || colaboradorExistente[0].USUARIO_ESTADO
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

    const [colaboradorExistente] = await connection.query(
      'SELECT * FROM Colaboradores WHERE ID_COLABORADOR = ?',
      [id]
    );

    if (colaboradorExistente.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const usuarioAntes = formatearUsuarioParaAuditoria(colaboradorExistente[0]);

    await connection.beginTransaction();
    await connection.query('DELETE FROM usuarios WHERE cedula = ?', [colaboradorExistente[0].CEDULA]);
    const [resultado] = await connection.query('DELETE FROM Colaboradores WHERE ID_COLABORADOR = ?', [id]);
    await connection.commit();

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

export {
  login,
  obtenerMiPerfil,
  obtenerColaboradorPorCedula,
  registro,
  obtenerUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario,
};