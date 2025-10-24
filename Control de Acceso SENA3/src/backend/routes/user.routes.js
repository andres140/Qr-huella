import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database.js';
import { verificarToken, verificarAdmin } from '../middleware/auth.middleware.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// ============================================
// GET /api/users - Obtener todos los usuarios
// ============================================
router.get('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, usuario, nombre, email, rol, estado, fecha_creacion FROM users ORDER BY nombre ASC'
    );

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
});

// ============================================
// GET /api/users/:id - Obtener usuario por ID
// ============================================
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Solo admin puede ver otros usuarios, users normales solo pueden verse a sí mismos
    if (req.user.rol !== 'ADMINISTRADOR' && req.user.id != id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este usuario'
      });
    }

    const [users] = await pool.query(
      'SELECT id, usuario, nombre, email, rol, estado, fecha_creacion FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message
    });
  }
});

// ============================================
// POST /api/users - Crear nuevo usuario
// ============================================
router.post('/',
  verificarToken,
  verificarAdmin,
  [
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol').isIn(['GUARDA', 'ADMINISTRADOR']).withMessage('Rol inválido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
      }

      const { nombre, email, password, rol } = req.body;

      // Verificar si el email ya existe
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un usuario con este email'
        });
      }

      // Generar usuario del email
      const usuario = email.split('@')[0];

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insertar usuario
      const [result] = await pool.query(
        'INSERT INTO users (usuario, nombre, email, password, rol, estado) VALUES (?, ?, ?, ?, ?, ?)',
        [usuario, nombre, email, hashedPassword, rol, 'ACTIVO']
      );

      const [newUser] = await pool.query(
        'SELECT id, usuario, nombre, email, rol, estado, fecha_creacion FROM users WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: newUser[0]
      });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear usuario',
        error: error.message
      });
    }
  }
);

// ============================================
// PUT /api/users/:id - Actualizar usuario
// ============================================
router.put('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar si el usuario existe
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Construir query de actualización
    const fields = [];
    const values = [];

    if (updates.nombre) {
      fields.push('nombre = ?');
      values.push(updates.nombre);
    }

    if (updates.email) {
      fields.push('email = ?');
      values.push(updates.email);
    }

    if (updates.password) {
      const hashedPassword = await bcrypt.hash(updates.password, 10);
      fields.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.rol) {
      fields.push('rol = ?');
      values.push(updates.rol);
    }

    if (updates.estado) {
      fields.push('estado = ?');
      values.push(updates.estado);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    values.push(id);

    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await pool.query(
      'SELECT id, usuario, nombre, email, rol, estado, fecha_creacion FROM users WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
});

// ============================================
// DELETE /api/users/:id - Eliminar usuario
// ============================================
router.delete('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir que el admin se elimine a sí mismo
    if (req.user.id == id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
});

export default router;
