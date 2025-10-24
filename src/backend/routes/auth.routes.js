import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// ============================================
// POST /api/auth/login - Iniciar sesión
// ============================================
router.post('/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida')
  ],
  async (req, res) => {
    try {
      // Validar errores
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Buscar usuario por email
      const [users] = await pool.query(
        'SELECT * FROM users WHERE email = ? AND estado = ?',
        [email, 'ACTIVO']
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas o usuario inactivo'
        });
      }

      const user = users[0];

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Generar token JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          rol: user.rol
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Retornar usuario sin la contraseña
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: userWithoutPassword,
          token
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión',
        error: error.message
      });
    }
  }
);

// ============================================
// POST /api/auth/register - Registrar usuario
// ============================================
router.post('/register',
  [
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol').isIn(['GUARDA', 'ADMINISTRADOR']).withMessage('Rol inválido')
  ],
  async (req, res) => {
    try {
      // Validar errores
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
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      // Generar usuario automático del email
      const usuario = email.split('@')[0];

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insertar usuario
      const [result] = await pool.query(
        'INSERT INTO users (usuario, nombre, email, password, rol, estado) VALUES (?, ?, ?, ?, ?, ?)',
        [usuario, nombre, email, hashedPassword, rol, 'ACTIVO']
      );

      // Obtener el usuario creado
      const [newUsers] = await pool.query(
        'SELECT id, usuario, nombre, email, rol, estado, fecha_creacion FROM users WHERE id = ?',
        [result.insertId]
      );

      const newUser = newUsers[0];

      // Generar token JWT
      const token = jwt.sign(
        {
          id: newUser.id,
          email: newUser.email,
          rol: newUser.rol
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: newUser,
          token
        }
      });
    } catch (error) {
      console.error('Error en register:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar usuario',
        error: error.message
      });
    }
  }
);

// ============================================
// POST /api/auth/forgot-password - Recuperar contraseña
// ============================================
router.post('/forgot-password',
  [
    body('email').isEmail().withMessage('Email inválido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido',
          errors: errors.array()
        });
      }

      const { email } = req.body;

      // Buscar usuario por email
      const [users] = await pool.query(
        'SELECT id, email, nombre FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        // Por seguridad, no revelar si el email existe o no
        return res.json({
          success: true,
          message: 'Si el email existe, recibirás un código de verificación'
        });
      }

      // Generar código de 6 dígitos
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Aquí deberías enviar el código por email usando un servicio como EmailJS o Nodemailer
      // Por ahora solo lo retornamos (en producción NO hagas esto)
      
      res.json({
        success: true,
        message: 'Código de verificación enviado',
        // SOLO PARA DESARROLLO - ELIMINAR EN PRODUCCIÓN
        ...(process.env.NODE_ENV === 'development' && { code: verificationCode })
      });
    } catch (error) {
      console.error('Error en forgot-password:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar solicitud',
        error: error.message
      });
    }
  }
);

export default router;
