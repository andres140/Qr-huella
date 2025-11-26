const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambiar_en_produccion';

// Middleware para verificar token
const verificarToken = (req, res, next) => {
  // Intentar obtener el token de diferentes formas
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader) {
    console.log('❌ No se encontró header Authorization');
    return res.status(401).json({ error: true, message: 'Token no proporcionado' });
  }
  
  // Extraer el token (acepta tanto "Bearer token" como solo "token")
  let token = authHeader;
  if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  if (!token) {
    console.log('❌ No se pudo extraer el token del header');
    return res.status(401).json({ error: true, message: 'Token no proporcionado' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    console.log('✅ Token verificado correctamente para usuario:', decoded.email || decoded.id);
    next();
  } catch (error) {
    console.log('❌ Error al verificar token:', error.message);
    return res.status(401).json({ error: true, message: 'Token inválido' });
  }
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Intento de login recibido:', { email, tienePassword: !!password });
    
    if (!email || !password) {
      console.log('❌ Faltan credenciales');
      return res.status(400).json({ error: true, message: 'Email y contraseña son requeridos' });
    }
    
    // Buscar por email (sin filtrar por estado primero para ver si existe)
    const [usuariosTodos] = await db.query(
      'SELECT id_usuario, email, estado, passwords FROM usuarios WHERE email = ?',
      [email]
    );
    
    console.log(`📋 Usuarios encontrados (sin filtro): ${usuariosTodos.length}`);
    
    if (usuariosTodos.length === 0) {
      console.log('❌ Usuario no existe en la base de datos:', email);
      console.log('💡 Ejecuta: node scripts/setupDatabase.js para crear usuarios por defecto');
      return res.status(401).json({ 
        error: true, 
        message: 'Credenciales inválidas',
        details: 'El email o la contraseña son incorrectos'
      });
    }
    
    // Verificar si el usuario está activo
    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND estado = ?',
      [email, 'ACTIVO']
    );
    
    if (usuarios.length === 0) {
      console.log('❌ Usuario existe pero está inactivo:', email);
      console.log('   Estado del usuario:', usuariosTodos[0].estado);
      return res.status(401).json({ 
        error: true, 
        message: 'Usuario inactivo',
        details: 'Tu cuenta está inactiva. Contacta al administrador para activarla.'
      });
    }
    
    const user = usuarios[0];
    console.log(`✅ Usuario encontrado: ${user.email} (ID: ${user.id_usuario}, Rol: ${user.rol})`);
    
    // Verificar que el campo passwords existe
    if (!user.passwords) {
      console.log('❌ Error: El campo passwords está vacío para el usuario:', user.email);
      return res.status(500).json({ error: true, message: 'Error en la configuración del usuario' });
    }
    
    // Verificar contraseña
    console.log('🔑 Verificando contraseña...');
    console.log('   Hash almacenado (primeros 20 caracteres):', user.passwords.substring(0, 20) + '...');
    
    const passwordValido = await bcrypt.compare(password, user.passwords);
    
    console.log('🔑 Resultado verificación:', passwordValido ? '✅ Válida' : '❌ Inválida');
    
    if (!passwordValido) {
      console.log('❌ Contraseña incorrecta para usuario:', user.email);
      console.log('💡 Verifica que la contraseña sea correcta o ejecuta: node scripts/setupDatabase.js');
      return res.status(401).json({ 
        error: true, 
        message: 'Credenciales inválidas',
        details: 'El email o la contraseña son incorrectos'
      });
    }
    
    console.log('✅ Login exitoso para:', user.email);
    
    // Actualizar último acceso
    await db.query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?',
      [user.id_usuario]
    );
    
    // Generar token
    const token = jwt.sign(
      { id: user.id_usuario, email: user.email, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({
      success: true,
      token,
      usuario: {
        id: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        estado: user.estado
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: true, message: 'Error al iniciar sesión' });
  }
});

// Verificar token
router.get('/verify', verificarToken, async (req, res) => {
  try {
    const [usuarios] = await db.query(
      'SELECT id_usuario, nombre, email, rol, estado FROM usuarios WHERE id_usuario = ?',
      [req.usuario.id]
    );
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
    }
    
    const usuario = usuarios[0];
    res.json({ 
      success: true, 
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estado: usuario.estado
      }
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ error: true, message: 'Error al verificar token' });
  }
});

// Obtener usuario por email (para recuperación de contraseña)
router.post('/usuario-por-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: true, message: 'Email es requerido' });
    }
    
    const [usuarios] = await db.query(
      'SELECT id_usuario, nombre, email, rol, estado FROM usuarios WHERE email = ?',
      [email]
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
        estado: usuario.estado
      }
    });
  } catch (error) {
    console.error('Error al obtener usuario por email:', error);
    res.status(500).json({ error: true, message: 'Error al obtener usuario' });
  }
});

// Obtener contraseña por email (para recuperación - solo para uso interno con código de verificación)
// NOTA: En producción, esto debería ser más seguro (no devolver la contraseña directamente)
router.post('/password-por-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: true, message: 'Email es requerido' });
    }
    
    const [usuarios] = await db.query(
      'SELECT id_usuario, nombre, email, passwords FROM usuarios WHERE email = ?',
      [email]
    );
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
    }
    
    const usuario = usuarios[0];
    
    // NOTA: En producción, esto NO debería devolver la contraseña directamente
    // Debería generar un token de recuperación y permitir cambiar la contraseña
    // Por ahora, devolvemos un mensaje indicando que la contraseña está hasheada
    res.json({ 
      success: true, 
      data: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        password: 'La contraseña está encriptada. Contacta al administrador para restablecerla.'
      }
    });
  } catch (error) {
    console.error('Error al obtener contraseña por email:', error);
    res.status(500).json({ error: true, message: 'Error al obtener contraseña' });
  }
});

module.exports = { router, verificarToken };


