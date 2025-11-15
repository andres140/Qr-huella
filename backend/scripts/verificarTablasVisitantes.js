const mysql = require('mysql2/promise');
require('dotenv').config();

async function verificarTablas() {
  let connection;
  
  try {
    console.log('🔄 Conectando a MySQL...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sena_acceso',
    });
    
    console.log('✅ Conectado a MySQL\n');
    
    // Verificar si existen las tablas de visitantes
    const [tables] = await connection.query('SHOW TABLES');
    
    console.log('📋 Tablas en la base de datos:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    
    console.log('\n🔍 Verificando tablas de visitantes:');
    
    const tablasVisitantes = ['visitantes', 'codigos_qr_visitantes', 'registros_visitantes'];
    
    for (const tabla of tablasVisitantes) {
      const existe = tables.some(t => Object.values(t)[0] === tabla);
      if (existe) {
        console.log(`   ✅ ${tabla} - EXISTE`);
        
        // Mostrar estructura de la tabla
        const [columns] = await connection.query(`DESCRIBE ${tabla}`);
        console.log(`      Columnas:`);
        columns.forEach(col => {
          console.log(`        - ${col.Field} (${col.Type})`);
        });
      } else {
        console.log(`   ❌ ${tabla} - NO EXISTE`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificarTablas();

