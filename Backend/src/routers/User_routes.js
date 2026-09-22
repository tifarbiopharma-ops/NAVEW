import express from 'express';
import { 
  obtenerMiPerfil,
  registro, 
  login, 
  obtenerUsuarios, 
  obtenerUsuario, 
  actualizarUsuario, 
  eliminarUsuario 
} from '../controllers/user_controllers.js';
import { verificarTokenJWT } from '../middlewares/JWT.js';

const router = express.Router();

// POST - Login de usuario
// La ruta es /api/users/login
router.post('/login', login);
// GET - Obtener perfil del usuario
// La ruta es /api/users/mi-perfil
router.get('/mi-perfil', verificarTokenJWT, obtenerMiPerfil);
// POST - Registro de usuario
// La ruta es /api/users/registro
router.post('/registro', verificarTokenJWT, registro);
// GET - Obtener todos los usuarios
// La ruta es /api/users/usuarios
router.get('/usuarios', verificarTokenJWT, obtenerUsuarios);
// GET - Obtener un usuario específico
// La ruta es /api/users/usuarios/:id
router.get('/usuarios/:id', verificarTokenJWT, obtenerUsuario);
// PUT - Actualizar un usuario específico
// La ruta es /api/users/usuarios/:id
router.put('/usuarios/:id', verificarTokenJWT, actualizarUsuario);
// DELETE - Eliminar un usuario específico
// La ruta es /api/users/usuarios/:id
router.delete('/usuarios/:id', verificarTokenJWT, eliminarUsuario);

export default router;
