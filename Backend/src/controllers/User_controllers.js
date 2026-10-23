
import bcryptjs from 'bcryptjs';
import pool from '../database.js';
import { crearTokenJWT } from '../middlewares/JWT.js';
import { registrarReporteUsuario } from '../utils/reportesUsuarios.js';

const ROLES = [
  'administrador',
  'jefe',
  'solicitante',
  'supervisor',
  'subgerentegeneral',
  'gerentegeneral',
  'gerente',
  'subgerente',
  'presidente'
];

const DOMINIOS = [
  '@farbiopharma.com',
  '@inpel.com',
  '@clarel.com'
];

const ESTADOS = ['activo', 'bloqueado'];
const MAX_INTENTOS = 3;
const intentosLogin = new Map();

const emailNormalizado = value =>
  String(value || '').trim().toLowerCase();

const emailPermitido = value =>
  DOMINIOS.some(d => value.endsWith(d));

const usernameNormalizado = value =>
  String(value || '').trim().toUpperCase();

const esAdmin = req =>
  req.user?.rol === 'administrador';

const errorInterno = (res, etiqueta, err) => {
  console.error(etiqueta, err);

  return res.status(500).json({
    msg: 'Ocurrió un error en el servidor'
  });
};

const limpiarIntentosLogin = username => {
  intentosLogin.delete(usernameNormalizado(username));
};

const usuarioPublico = u => ({
  id: u.id,
  id_colaborador: u.ID_COLABORADOR ?? null,
  nombre: u.NOMBRE ?? null,
  cedula: u.cedula,
  username: u.username,
  email: u.email,
  rol: u.rol,
  estado: u.estado,
  created_at: u.created_at,
  updated_at: u.updated_at
});

const auditar = async datos => {
  try {
    await registrarReporteUsuario(datos);
  } catch (err) {
    console.error('Fallo de auditoría:', err);
  }
};

// Formato: PEREZ LOPEZ JUAN CARLOS -> JPEREZ
const generarUsername = nombreCompleto => {
  const partes = String(nombreCompleto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  // Se requiere: apellido1 apellido2 nombre1
  if (partes.length < 3) {
    return null;
  }

  const primerApellido = partes[0];
  const primerNombre = partes[2];

  return `${primerNombre.charAt(0)}${primerApellido}`;
};

// =============================================
// LOGIN POR USERNAME
// =============================================

const login = async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (
      typeof username !== 'string' ||
      !username.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        msg: 'Usuario y contraseña son requeridos'
      });
    }

    const usuarioLogin = usernameNormalizado(username);

    const [rows] = await pool.query(
      `SELECT
        usu.id,
        usu.cedula,
        usu.username,
        usu.email,
        usu.password,
        usu.rol,
        usu.estado,
        col.ID_COLABORADOR,
        col.NOMBRE
       FROM usuarios usu
       LEFT JOIN Colaboradores col
         ON col.CEDULA = usu.cedula
       WHERE usu.username = ?
       LIMIT 1`,
      [usuarioLogin]
    );

    const usuario = rows[0];

    if (!usuario?.password) {
      return res.status(401).json({
        msg: 'Usuario o contraseña incorrectos'
      });
    }

    if (usuario.estado !== 'activo') {
      return res.status(403).json({
        msg: 'Cuenta inactiva o bloqueada'
      });
    }

    const valida = await bcryptjs.compare(
      password,
      usuario.password
    );

    if (!valida) {
      const intentos =
        (intentosLogin.get(usuarioLogin) || 0) + 1;

      intentosLogin.set(usuarioLogin, intentos);

      if (intentos >= MAX_INTENTOS) {
        await pool.query(
          `UPDATE usuarios
           SET estado = 'bloqueado'
           WHERE id = ? AND estado = 'activo'`,
          [usuario.id]
        );

        intentosLogin.delete(usuarioLogin);

        return res.status(403).json({
          msg: 'Cuenta bloqueada por seguridad. Contacta al administrador.'
        });
      }

      return res.status(401).json({
        msg: 'Usuario o contraseña incorrectos'
      });
    }

    intentosLogin.delete(usuarioLogin);

    const token = crearTokenJWT(
      usuario.id,
      usuario.rol
    );

    return res.status(200).json({
      msg: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.NOMBRE ?? null,
        username: usuario.username,
        email: usuario.email,
        rol: usuario.rol,
        estado: usuario.estado
      }
    });

  } catch (err) {
    return errorInterno(res, 'Error en login:', err);
  }
};

// =============================================
// OBTENER MI PERFIL
// =============================================

const obtenerMiPerfil = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        usu.id,
        usu.cedula,
        usu.username,
        usu.email,
        usu.rol,
        usu.estado,
        usu.created_at,
        usu.updated_at,
        col.ID_COLABORADOR,
        col.NOMBRE
       FROM usuarios usu
       LEFT JOIN Colaboradores col
         ON col.CEDULA = usu.cedula
       WHERE usu.id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        msg: 'Usuario no encontrado'
      });
    }

    const usuario = rows[0];

    return res.status(200).json({
      msg: 'Perfil obtenido exitosamente',
      usuario: {
        ...usuarioPublico(usuario),
        idColaborador: usuario.ID_COLABORADOR
      }
    });

  } catch (err) {
    return errorInterno(
      res,
      'Error obteniendo perfil:',
      err
    );
  }
};

// =============================================
// BUSCAR COLABORADOR POR CÉDULA
// =============================================

const obtenerColaboradorPorCedula = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({
      msg: 'Acceso denegado'
    });
  }

  try {
    const { cedula } = req.params;

    const [rows] = await pool.query(
      `SELECT
        c.ID_COLABORADOR,
        c.NOMBRE,
        c.CEDULA,
        co.CORREO AS email
       FROM Colaboradores c
       LEFT JOIN Correos co
         ON co.ID_CORREOS = c.ID_CORREO_PRINCIPAL
       WHERE c.CEDULA = ?
       LIMIT 1`,
      [cedula]
    );

    if (!rows.length) {
      return res.status(404).json({
        msg: 'No existe un colaborador con esa cédula'
      });
    }

    const colaborador = rows[0];

    return res.status(200).json({
      colaborador: {
        ...colaborador,
        username: generarUsername(colaborador.NOMBRE)
      }
    });

  } catch (err) {
    return errorInterno(
      res,
      'Error buscando colaborador:',
      err
    );
  }
};

// =============================================
// REGISTRAR USUARIO
// =============================================

const registro = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({
      msg: 'Solo administradores pueden registrar usuarios'
    });
  }

  let connection;
  let enTransaccion = false;

  try {
    const {
      email,
      password,
      cedula,
      rol
    } = req.body ?? {};

    if (
      ![password, cedula, rol].every(
        v => typeof v === 'string' && v.trim()
      )
    ) {
      return res.status(400).json({
        msg: 'Contraseña, cédula y rol son requeridos'
      });
    }

    if (!ROLES.includes(rol)) {
      return res.status(400).json({
        msg: 'Rol no válido'
      });
    }

    if (!/^\d{10}$/.test(cedula)) {
      return res.status(400).json({
        msg: 'La cédula debe tener 10 dígitos'
      });
    }

    if (
      password.length < 14 ||
      password.length > 20
    ) {
      return res.status(400).json({
        msg: 'La contraseña debe tener entre 14 y 20 caracteres'
      });
    }

    const correo = emailNormalizado(email);

    if (correo && !emailPermitido(correo)) {
      return res.status(400).json({
        msg: 'Dominio de correo no permitido'
      });
    }

    connection = await pool.getConnection();

    const [colaboradores] = await connection.query(
      `SELECT
        ID_COLABORADOR,
        NOMBRE,
        CEDULA
       FROM Colaboradores
       WHERE CEDULA = ?
       LIMIT 1`,
      [cedula]
    );

    if (!colaboradores.length) {
      return res.status(404).json({
        msg: 'No existe un colaborador con esa cédula'
      });
    }

    const colaborador = colaboradores[0];

    const username = generarUsername(colaborador.NOMBRE);

    if (!username) {
      return res.status(400).json({
        msg: 'No se pudo generar el username. Verifica el nombre del colaborador.'
      });
    }

    const [duplicados] = await connection.query(
      `SELECT id, cedula, username
       FROM usuarios
       WHERE cedula = ? OR username = ?
       LIMIT 1`,
      [cedula, username]
    );

    if (duplicados.length) {
      if (duplicados[0].cedula === cedula) {
        return res.status(409).json({
          msg: 'Este colaborador ya tiene una cuenta registrada'
        });
      }

      return res.status(409).json({
        msg: `El username ${username} ya está registrado`
      });
    }

    if (correo) {
      const [correos] = await connection.query(
        `SELECT id
         FROM usuarios
         WHERE email = ?
         LIMIT 1`,
        [correo]
      );

      if (correos.length) {
        return res.status(409).json({
          msg: 'El correo ya está registrado'
        });
      }
    }

    const hash = await bcryptjs.hash(password, 10);

    await connection.beginTransaction();
    enTransaccion = true;

    const [result] = await connection.query(
      `INSERT INTO usuarios
       (cedula, username, email, password, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cedula,
        username,
        correo || null,
        hash,
        rol,
        'activo'
      ]
    );

    await connection.commit();
    enTransaccion = false;

    const creado = {
      id: result.insertId,
      nombre: colaborador.NOMBRE,
      cedula,
      username,
      email: correo || null,
      rol,
      estado: 'activo'
    };

    await auditar({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      accion: 'crear_usuario',
      modulo: 'usuarios',
      campoAfectado: 'usuario',
      valorAnterior: null,
      valorNuevo: creado,
      targetUserId: result.insertId,
      targetUserName: creado.nombre
    });

    return res.status(201).json({
      msg: 'Usuario registrado exitosamente',
      usuario: creado
    });

  } catch (err) {
    if (enTransaccion) {
      await connection.rollback().catch(console.error);
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        msg: 'La cédula, username o correo ya están registrados'
      });
    }

    return errorInterno(
      res,
      'Error registrando usuario:',
      err
    );

  } finally {
    connection?.release();
  }
};

// =============================================
// OBTENER TODOS LOS USUARIOS
// =============================================

const obtenerUsuarios = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({
      msg: 'Acceso denegado'
    });
  }

  try {
    const [rows] = await pool.query(
        `SELECT
          usu.id,
          usu.cedula,
          usu.username,
          usu.email,
          usu.rol,
          usu.estado,
          col.NOMBRE
        FROM usuarios usu
        LEFT JOIN Colaboradores col
          ON col.CEDULA = usu.cedula
          ORDER BY usu.username`
    );

    return res.status(200).json({
      msg: 'Usuarios obtenidos exitosamente',
      usuarios: rows.map(usuarioPublico)
    });

  } catch (err) {
    return errorInterno(
      res,
      'Error obteniendo usuarios:',
      err
    );
  }
};

// =============================================
// OBTENER USUARIO POR ID
// =============================================

const obtenerUsuario = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({
      msg: 'Acceso denegado'
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
        usu.id,
        usu.cedula,
        usu.username,
        usu.email,
        usu.rol,
        usu.estado,
        usu.created_at,
        usu.updated_at,
        col.ID_COLABORADOR,
        col.NOMBRE
       FROM usuarios usu
       LEFT JOIN Colaboradores col
         ON col.CEDULA = usu.cedula
       WHERE usu.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        msg: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      msg: 'Usuario obtenido exitosamente',
      usuario: usuarioPublico(rows[0])
    });

  } catch (err) {
    return errorInterno(
      res,
      'Error obteniendo usuario:',
      err
    );
  }
};

// =============================================
// ACTUALIZAR USUARIO
// =============================================

const actualizarUsuario = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({
      msg: 'Solo administradores pueden actualizar usuarios'
    });
  }

  let connection;
  let enTransaccion = false;

  try {
    const { id } = req.params;

    const {
      nombre,
      cedula,
      email,
      rol,
      password,
      estado
    } = req.body ?? {};

    if (rol !== undefined && !ROLES.includes(rol)) {
      return res.status(400).json({
        msg: 'El rol no es válido'
      });
    }

    if (
      estado !== undefined &&
      (
        typeof estado !== 'string' ||
        !ESTADOS.includes(estado.toLowerCase())
      )
    ) {
      return res.status(400).json({
        msg: 'El estado no es válido'
      });
    }

    connection = await pool.getConnection();

    const [rows] = await connection.query(
      `SELECT
        id,
        cedula,
        username,
        email,
        rol,
        estado,
        password
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        msg: 'Usuario no encontrado'
      });
    }

    const actual = rows[0];
    const cedulaOriginal = actual.cedula;

    const [colaboradores] = await connection.query(
      `SELECT
        ID_COLABORADOR,
        NOMBRE,
        CEDULA
       FROM Colaboradores
       WHERE CEDULA = ?
       LIMIT 1`,
      [cedulaOriginal]
    );

    const colaborador = colaboradores[0] ?? null;

    const datosUsuario = {};
    const datosColaborador = {};
    const datosAuditoria = {};

    if (
      cedula !== undefined &&
      cedula !== cedulaOriginal
    ) {
      if (
        typeof cedula !== 'string' ||
        !/^\d{10}$/.test(cedula)
      ) {
        return res.status(400).json({
          msg: 'La cédula debe tener 10 dígitos'
        });
      }

      if (!colaborador) {
        return res.status(409).json({
          msg: 'No hay colaborador asociado a la cédula actual'
        });
      }

      const [dupUsuarios] = await connection.query(
        `SELECT id
         FROM usuarios
         WHERE cedula = ? AND id <> ?
         LIMIT 1`,
        [cedula, id]
      );

      const [dupColaboradores] = await connection.query(
        `SELECT ID_COLABORADOR
         FROM Colaboradores
         WHERE CEDULA = ?
           AND ID_COLABORADOR <> ?
         LIMIT 1`,
        [cedula, colaborador.ID_COLABORADOR]
      );

      if (dupUsuarios.length || dupColaboradores.length) {
        return res.status(409).json({
          msg: 'La cédula ya está registrada'
        });
      }

      datosUsuario.cedula = cedula;
      datosColaborador.CEDULA = cedula;
      datosAuditoria.cedula = cedula;
    }

    if (email !== undefined) {
      if (
        email !== null &&
        typeof email !== 'string'
      ) {
        return res.status(400).json({
          msg: 'Email inválido'
        });
      }

      const correo = emailNormalizado(email);

      if (correo && !emailPermitido(correo)) {
        return res.status(400).json({
          msg: 'Dominio de correo no permitido'
        });
      }

      if (correo !== emailNormalizado(actual.email)) {
        if (correo) {
          const [dup] = await connection.query(
            `SELECT id
             FROM usuarios
             WHERE email = ? AND id <> ?
             LIMIT 1`,
            [correo, id]
          );

          if (dup.length) {
            return res.status(409).json({
              msg: 'El email ya está registrado'
            });
          }
        }

        datosUsuario.email = correo || null;
        datosAuditoria.email = correo || null;
      }
    }

    if (rol !== undefined && rol !== actual.rol) {
      datosUsuario.rol = rol;
      datosAuditoria.rol = rol;
    }

    if (
      estado !== undefined &&
      estado.toLowerCase() !== actual.estado
    ) {
      datosUsuario.estado = estado.toLowerCase();
      datosAuditoria.estado = datosUsuario.estado;
    }

    if (
      password !== undefined &&
      password !== null &&
      password !== ''
    ) {
      if (
        typeof password !== 'string' ||
        password.length < 14 ||
        password.length > 20
      ) {
        return res.status(400).json({
          msg: 'La contraseña debe tener entre 14 y 20 caracteres'
        });
      }

      if (
        await bcryptjs.compare(
          password,
          actual.password
        )
      ) {
        return res.status(400).json({
          msg: 'La nueva contraseña no puede ser igual a la actual'
        });
      }

      datosUsuario.password = await bcryptjs.hash(
        password,
        10
      );

      datosAuditoria.password = 'actualizada';
    }

    if (nombre !== undefined) {
      if (
        typeof nombre !== 'string' ||
        !nombre.trim()
      ) {
        return res.status(400).json({
          msg: 'Nombre inválido'
        });
      }

      if (!colaborador) {
        return res.status(404).json({
          msg: 'No existe colaborador asociado a la cédula'
        });
      }

      const nuevoNombre = nombre.trim();

      if (nuevoNombre !== colaborador.NOMBRE) {
        const nuevoUsername = generarUsername(nuevoNombre);

        if (!nuevoUsername) {
          return res.status(400).json({
            msg: 'El nombre debe contener dos apellidos y al menos un nombre'
          });
        }

        if (nuevoUsername !== actual.username) {
          const [duplicados] = await connection.query(
            `SELECT id
             FROM usuarios
             WHERE username = ?
               AND id <> ?
             LIMIT 1`,
            [nuevoUsername, id]
          );

          if (duplicados.length) {
            return res.status(409).json({
              msg: `El username ${nuevoUsername} ya está registrado`
            });
          }

          datosUsuario.username = nuevoUsername;
          datosAuditoria.username = nuevoUsername;
        }

        datosColaborador.NOMBRE = nuevoNombre;
        datosAuditoria.nombre = nuevoNombre;
      }
    }

    if (
      !Object.keys(datosUsuario).length &&
      !Object.keys(datosColaborador).length
    ) {
      return res.status(400).json({
        msg: 'No se detectaron cambios para actualizar'
      });
    }

    const anteriores = {
      nombre: colaborador?.NOMBRE ?? null,
      cedula: actual.cedula,
      username: actual.username,
      email: actual.email,
      rol: actual.rol,
      estado: actual.estado,
      password: null
    };

    await connection.beginTransaction();
    enTransaccion = true;

    if (Object.keys(datosUsuario).length) {
      const columnas = Object.keys(datosUsuario);

      await connection.query(
        `UPDATE usuarios
         SET ${columnas.map(c => `${c} = ?`).join(', ')},
             updated_at = NOW()
         WHERE id = ?`,
        [...Object.values(datosUsuario), id]
      );
    }

    if (Object.keys(datosColaborador).length) {
      const columnas = Object.keys(datosColaborador);

      await connection.query(
        `UPDATE Colaboradores
         SET ${columnas.map(c => `${c} = ?`).join(', ')},
             UPDATED_AT = NOW()
         WHERE CEDULA = ?`,
        [
          ...Object.values(datosColaborador),
          cedulaOriginal
        ]
      );
    }

    await connection.commit();
    enTransaccion = false;

    if (datosUsuario.estado === 'activo') {
      limpiarIntentosLogin(actual.username);
    }

    if (
      datosUsuario.username &&
      datosUsuario.username !== actual.username
    ) {
      limpiarIntentosLogin(actual.username);
    }

    for (const [campo, valorNuevo] of Object.entries(datosAuditoria)) {
      await auditar({
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_USUARIO',
        modulo: 'usuarios',
        campoAfectado: campo,
        valorAnterior: anteriores[campo] ?? null,
        valorNuevo:
          campo === 'password'
            ? 'CONTRASEÑA MODIFICADA'
            : valorNuevo,
        targetUserId: Number(id),
        targetUserName:
          datosColaborador.NOMBRE ??
          colaborador?.NOMBRE ??
          null
      });
    }

    const usuario = {
      id: Number(id),
      nombre:
        datosColaborador.NOMBRE ??
        colaborador?.NOMBRE ??
        null,
      cedula:
        datosUsuario.cedula ?? actual.cedula,
      username:
        datosUsuario.username ?? actual.username,
      email:
        datosUsuario.email !== undefined
          ? datosUsuario.email
          : actual.email,
      rol:
        datosUsuario.rol ?? actual.rol,
      estado:
        datosUsuario.estado ?? actual.estado
    };

    return res.status(200).json({
      msg: 'Usuario actualizado correctamente',
      usuario,
      cambios: datosAuditoria
    });

  } catch (err) {
    if (enTransaccion) {
      await connection.rollback().catch(console.error);
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        msg: 'La cédula, username o email ya están registrados'
      });
    }

    return errorInterno(
      res,
      'Error actualizando usuario:',
      err
    );

  } finally {
    connection?.release();
  }
};

// =============================================
// ELIMINAR USUARIO
// =============================================

const eliminarUsuario = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({
      msg: 'Solo administradores pueden eliminar usuarios'
    });
  }

  let connection;
  let enTransaccion = false;

  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(409).json({
        msg: 'No puedes eliminar tu propia cuenta'
      });
    }

    connection = await pool.getConnection();

    const [rows] = await connection.query(
      `SELECT
        usu.id,
        usu.cedula,
        usu.username,
        usu.email,
        usu.rol,
        usu.estado,
        col.NOMBRE
       FROM usuarios usu
       LEFT JOIN Colaboradores col
         ON col.CEDULA = usu.cedula
       WHERE usu.id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        msg: 'Usuario no encontrado'
      });
    }

    const anterior = rows[0];

    await connection.beginTransaction();
    enTransaccion = true;

    await connection.query(
      'DELETE FROM usuarios WHERE id = ?',
      [id]
    );

    await connection.commit();
    enTransaccion = false;

    limpiarIntentosLogin(anterior.username);

    await auditar({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      accion: 'eliminar_usuario',
      modulo: 'usuarios',
      campoAfectado: 'usuario',
      valorAnterior: {
        id: anterior.id,
        nombre: anterior.NOMBRE,
        cedula: anterior.cedula,
        username: anterior.username,
        email: anterior.email,
        rol: anterior.rol,
        estado: anterior.estado
      },
      valorNuevo: null,
      targetUserId: Number(id),
      targetUserName: anterior.NOMBRE ?? null
    });

    return res.status(200).json({
      msg: 'Usuario eliminado exitosamente'
    });

  } catch (err) {
    if (enTransaccion) {
      await connection.rollback().catch(console.error);
    }

    return errorInterno(
      res,
      'Error eliminando usuario:',
      err
    );

  } finally {
    connection?.release();
  }
};

// =============================================
// EXPORTACIONES
// =============================================

export {
  login,
  obtenerMiPerfil,
  obtenerColaboradorPorCedula,
  registro,
  obtenerUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario
};
