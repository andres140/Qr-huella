const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken } = require('./auth');
const bcrypt = require('bcrypt');

// Middleware de autenticación
router.use(verificarToken);

// Middleware para verificar rol de administrador
const soloAdministrador = (req, res, next) => {
  if (req.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: true, message: 'Acceso denegado. Solo administradores' });
  }
  next();
};

// Obtener todos los usuarios (solo administradores)
router.get('/', soloAdministrador, async (req, res) => {
  try {
    const [usuarios] = await db.query(
      'SELECT id_usuario, nombre, email, rol, estado, fecha_creacion, ultimo_acceso FROM usuarios ORDER BY nombre ASC'
    );
    // Mapear id_usuario a id para compatibilidad
    const usuariosMapeados = usuarios.map(u => ({
      id: u.id_usuario,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      estado: u.estado,
      fechaCreacion: u.fecha_creacion,
      ultimoAcceso: u.ultimo_acceso
    }));
    res.json({ success: true, data: usuariosMapeados });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: true, message: 'Error al obtener usuarios' });
  }
});

// Obtener usuario por ID (solo administradores)
router.get('/:id', soloAdministrador, async (req, res) => {
  try {
    const [usuarios] = await db.query(
      'SELECT id_usuario, nombre, email, rol, estado, fecha_creacion, ultimo_acceso FROM usuarios WHERE id_usuario = ?',
      [req.params.id]
    );
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
    }
    
    const usuario = usuarios[0];
    res.json({ 
      success: true, 
      data: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estado: usuario.estado,
        fechaCreacion: usuario.fecha_creacion,
        ultimoAcceso: usuario.ultimo_acceso
      }
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: true, message: 'Error al obtener usuario' });
  }
});

// Crear nuevo usuario (solo administradores)
router.post('/', soloAdministrador, async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    
    // Validaciones
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ 
        error: true, 
        message: 'Campos requeridos: nombre, email, password, rol' 
      });
    }
    
    // Verificar si el email ya existe
    const [usuarioExiste] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );
    
    if (usuarioExiste.length > 0) {
      return res.status(400).json({ 
        error: true, 
        message: 'El email ya está registrado' 
      });
    }
    
    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    await db.query(
      `INSERT INTO usuarios (nombre, email, passwords, rol, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, email, passwordHash, rol, 'ACTIVO']
    );
    
    const [nuevoUsuario] = await db.query(
      'SELECT id_usuario, nombre, email, rol, estado, fecha_creacion FROM usuarios WHERE email = ?',
      [email]
    );
    
    const usuario = nuevoUsuario[0];
    res.status(201).json({ 
      success: true, 
      data: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estado: usuario.estado,
        fechaCreacion: usuario.fecha_creacion
      }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: true, message: 'Error al crear usuario' });
  }
});

// Actualizar usuario (solo administradores)
router.put('/:id', soloAdministrador, async (req, res) => {
  try {
    const { nombre, email, rol, estado, password } = req.body;
    
    // Verificar si el usuario existe
    const [usuarioExiste] = await db.query('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [req.params.id]);
    if (usuarioExiste.length === 0) {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
    }
    
    // Si se está actualizando el email, verificar que no exista en otro usuario
    if (email) {
      const [emailExiste] = await db.query(
        'SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?',
        [email, req.params.id]
      );
      if (emailExiste.length > 0) {
        return res.status(400).json({ error: true, message: 'El email ya está registrado en otro usuario' });
      }
    }
    
    let query = `UPDATE usuarios SET nombre = COALESCE(?, nombre), email = COALESCE(?, email), rol = COALESCE(?, rol), estado = COALESCE(?, estado)`;
    let params = [nombre, email, rol, estado];
    
    // Si se proporciona nueva contraseña, encriptarla
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      query += ', passwords = ?';
      params.push(passwordHash);
    }
    
    query += ' WHERE id_usuario = ?';
    params.push(req.params.id);
    
    await db.query(query, params);
    
    const [usuarioActualizado] = await db.query(
      'SELECT id_usuario, nombre, email, rol, estado, fecha_creacion, ultimo_acceso FROM usuarios WHERE id_usuario = ?',
      [req.params.id]
    );
    
    const usuario = usuarioActualizado[0];
    res.json({ 
      success: true, 
      data: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estado: usuario.estado,
        fechaCreacion: usuario.fecha_creacion,
        ultimoAcceso: usuario.ultimo_acceso
      }
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: true, message: 'Error al actualizar usuario' });
  }
});

// Eliminar usuario (solo administradores)
router.delete('/:id', soloAdministrador, async (req, res) => {
  try {
    // No permitir eliminar el propio usuario
    if (req.params.id === req.usuario.id) {
      return res.status(400).json({ error: true, message: 'No puedes eliminar tu propio usuario' });
    }
    
    const [resultado] = await db.query('DELETE FROM usuarios WHERE id_usuario = ?', [req.params.id]);
    
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
    }
    
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: true, message: 'Error al eliminar usuario' });
  }
});

// Cambiar contraseña (cualquier usuario puede cambiar la suya)
router.put('/:id/cambiar-password', async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    
    // Solo puede cambiar su propia contraseña o ser administrador
    if (req.params.id !== req.usuario.id && req.usuario.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para cambiar esta contraseña' });
    }
    
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ 
        error: true, 
        message: 'Se requiere contraseña actual y nueva contraseña' 
      });
    }
    
    // Obtener usuario
    const [usuarios] = await db.query('SELECT passwords FROM usuarios WHERE id_usuario = ?', [req.params.id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
    }
    
    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(passwordActual, usuarios[0].passwords);
    if (!passwordValida) {
      return res.status(401).json({ error: true, message: 'Contraseña actual incorrecta' });
    }
    
    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordNueva, salt);
    
    await db.query('UPDATE usuarios SET passwords = ? WHERE id_usuario = ?', [passwordHash, req.params.id]);
    
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: true, message: 'Error al cambiar contraseña' });
  }
});

module.exports = router;


