import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { verificarConexion } from './config/database.js';

// Importar rutas
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import personRoutes from './routes/person.routes.js';
import accessRoutes from './routes/access.routes.js';
import visitorQRRoutes from './routes/visitorQR.routes.js';
import chatRoutes from './routes/chat.routes.js';
import statsRoutes from './routes/stats.routes.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================

// Helmet para headers de seguridad
app.use(helmet());

// CORS - Permitir peticiones desde el frontend
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting - Limitar peticiones por IP
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutos por defecto
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // 100 peticiones por ventana
  message: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ============================================
// MIDDLEWARES DE PARSEO
// ============================================

// Parsear JSON
app.use(express.json({ limit: '10mb' }));

// Parsear URL-encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// RUTAS
// ============================================

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({
    message: '🟢 API Huella SENA - Sistema de Control de Acceso',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      persons: '/api/persons',
      access: '/api/access',
      visitorQRs: '/api/visitor-qrs',
      chat: '/api/chat',
      stats: '/api/stats'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Registrar rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/visitor-qrs', visitorQRRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stats', statsRoutes);

// ============================================
// MANEJO DE ERRORES
// ============================================

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const iniciarServidor = async () => {
  try {
    // Verificar conexión a la base de datos
    const dbConnected = await verificarConexion();
    
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos. Verifica la configuración en .env');
      process.exit(1);
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                                                               ║');
      console.log('║       🟢 SERVIDOR HUELLA SENA - INICIADO CORRECTAMENTE       ║');
      console.log('║                                                               ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
      console.log('');
      console.log('Endpoints disponibles:');
      console.log(`  • Auth:       http://localhost:${PORT}/api/auth`);
      console.log(`  • Users:      http://localhost:${PORT}/api/users`);
      console.log(`  • Persons:    http://localhost:${PORT}/api/persons`);
      console.log(`  • Access:     http://localhost:${PORT}/api/access`);
      console.log(`  • Visitor QR: http://localhost:${PORT}/api/visitor-qrs`);
      console.log(`  • Chat:       http://localhost:${PORT}/api/chat`);
      console.log(`  • Stats:      http://localhost:${PORT}/api/stats`);
      console.log('');
      console.log('Presiona CTRL + C para detener el servidor');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar el servidor
iniciarServidor();

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

export default app;
