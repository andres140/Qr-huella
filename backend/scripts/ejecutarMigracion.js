const mysql = require('mysql2/promise');
require('dotenv').config();

async function ejecutarMigracion() {
  let connection;
  
  try {
    console.log('🔄 Conectando a MySQL...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sena_acceso',
    });
    
    console.log('✅ Conectado a MySQL');
    
    // Verificar si la columna zona existe
    console.log('\n🔍 Verificando si la columna "zona" existe...');
    const [columnasZona] = await connection.query(`
      SELECT COUNT(*) as existe
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'personas' 
        AND COLUMN_NAME = 'zona'
    `, [process.env.DB_NAME || 'sena_acceso']);
    
    if (columnasZona[0].existe === 0) {
      console.log('📝 Agregando columna "zona"...');
      await connection.query(`
        ALTER TABLE personas 
        ADD COLUMN zona VARCHAR(200) NULL 
        COMMENT 'Zona o destino donde va la persona o visitante' 
        AFTER ficha
      `);
      console.log('✅ Columna "zona" agregada exitosamente');
    } else {
      console.log('✅ La columna "zona" ya existe');
    }
    
    // Verificar si la columna foto existe
    console.log('\n🔍 Verificando si la columna "foto" existe...');
    const [columnasFoto] = await connection.query(`
      SELECT COUNT(*) as existe
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'personas' 
        AND COLUMN_NAME = 'foto'
    `, [process.env.DB_NAME || 'sena_acceso']);
    
    if (columnasFoto[0].existe === 0) {
      console.log('📝 Agregando columna "foto"...');
      await connection.query(`
        ALTER TABLE personas 
        ADD COLUMN foto VARCHAR(500) NULL 
        COMMENT 'Ruta del archivo de foto (formato: uploads/fotos/[documento]-[timestamp].jpg)' 
        AFTER zona
      `);
      console.log('✅ Columna "foto" agregada exitosamente');
    } else {
      console.log('✅ La columna "foto" ya existe');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migración completada exitosamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error al ejecutar migración:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  La columna ya existe, esto es normal si se ejecuta múltiples veces');
    } else {
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

ejecutarMigracion();


