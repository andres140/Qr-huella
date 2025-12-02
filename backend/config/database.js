const mysql = require('mysql2/promise');
require('dotenv').config();

// Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sena_acceso',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Probar la conexión al iniciar
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a la base de datos establecida');
    connection.release();
  })
  .catch(error => {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    console.error('💡 Verifica las variables de entorno en el archivo .env');
  });

// Exportar el pool para usar en las rutas
module.exports = pool;

