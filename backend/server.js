const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Configurar CORS primero
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (Postman, mobile apps, etc)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5178',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todos en desarrollo
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Middlewares de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 peticiones por ventana
});
app.use('/api/', limiter);

// Parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos de uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`\n📡 ${req.method} ${req.path}`);
  if (Object.keys(req.body).length > 0) {
    console.log('   Body:', JSON.stringify(req.body, null, 2));
  }
  if (Object.keys(req.query).length > 0) {
    console.log('   Query:', req.query);
  }
  next();
});

// Rutas
const personasRoutes = require('./routes/personas');
const usuariosRoutes = require('./routes/usuarios');
const accesoRoutes = require('./routes/accesos');
const qrRoutes = require('./routes/qr');
const chatRoutes = require('./routes/chat');
const { router: authRoutes } = require('./routes/auth');

// Rutas simplificadas para el primer sprint
const aprendicesRoutes = require('./routes/aprendices');
const entradasSalidasRoutes = require('./routes/entradas_salidas');
const visitantesRoutes = require('./routes/visitantes');

app.use('/api/personas', personasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/accesos', accesoRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

// Rutas simplificadas
app.use('/api/aprendices', aprendicesRoutes);
app.use('/api/entradas-salidas', entradasSalidasRoutes);
app.use('/api/entradas_salidas', entradasSalidasRoutes); // Alias alternativo
app.use('/api/visitantes', visitantesRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Control de Acceso SENA funcionando correctamente' });
});

// Ruta para consultar estadísticas (sin autenticación para facilitar pruebas)
app.get('/api/estadisticas', async (req, res) => {
  try {
    const db = require('./config/database');
    
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM personas) as total_personas,
        (SELECT COUNT(*) FROM personas WHERE estado = 'ACTIVO') as personas_activas,
        (SELECT COUNT(*) FROM registros_entrada_salida) as total_registros,
        (SELECT COUNT(*) FROM registros_entrada_salida 
         WHERE DATE(fecha_entrada) = CURDATE() OR DATE(fecha_salida) = CURDATE()) as registros_hoy,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE estado = 'ACTIVO') as usuarios_activos,
        (SELECT COUNT(*) FROM roles_personas) as total_roles,
        (SELECT COUNT(*) FROM estados_personas) as total_estados
    `);
    
    // Obtener conteo por rol
    const [rolesCount] = await db.query(`
      SELECT 
        rp.nombre_rol_persona as rol,
        COUNT(p.id_persona) as cantidad
      FROM roles_personas rp
      LEFT JOIN personas p ON rp.id_rol_persona = p.id_rol_persona
      GROUP BY rp.id_rol_persona, rp.nombre_rol_persona
      ORDER BY cantidad DESC
    `);
    
    res.json({
      success: true,
      data: {
        personas: {
          total: stats[0].total_personas || 0,
          activas: stats[0].personas_activas || 0
        },
        registros: {
          total: stats[0].total_registros || 0,
          hoy: stats[0].registros_hoy || 0
        },
        usuarios: {
          total: stats[0].total_usuarios || 0,
          activos: stats[0].usuarios_activos || 0
        },
        configuracion: {
          roles: stats[0].total_roles || 0,
          estados: stats[0].total_estados || 0
        },
        porRol: rolesCount.map(r => ({
          rol: r.rol,
          cantidad: r.cantidad
        }))
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: true, message: 'Error al obtener estadísticas' });
  }
});

// Ruta de prueba para verificar que las rutas están registradas
app.get('/api/routes/test', (req, res) => {
  res.json({ 
    message: 'Rutas disponibles',
    rutas: [
      '/api/aprendices',
      '/api/entradas-salidas',
      '/api/entradas_salidas',
      '/api/visitantes',
      '/api/qr',
      '/api/auth/login'
    ]
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 API disponible en http://localhost:${PORT}/api`);
});

module.exports = app;