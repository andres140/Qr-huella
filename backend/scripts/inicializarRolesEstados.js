const mysql = require('mysql2/promise');
require('dotenv').config();

async function inicializarRolesEstados() {
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
    
    // Insertar estados de personas iniciales
    console.log('🔄 Creando estados de personas...');
    await connection.query(`
      INSERT IGNORE INTO estados_personas (nombre_estado) VALUES ('ACTIVO')
    `);
    await connection.query(`
      INSERT IGNORE INTO estados_personas (nombre_estado) VALUES ('INACTIVO')
    `);
    await connection.query(`
      INSERT IGNORE INTO estados_personas (nombre_estado) VALUES ('EN FORMACION')
    `);
    await connection.query(`
      INSERT IGNORE INTO estados_personas (nombre_estado) VALUES ('APLAZADO')
    `);
    console.log('✅ Estados de personas creados\n');
    
    // Insertar roles de personas iniciales
    console.log('🔄 Creando roles de personas...');
    await connection.query(`
      INSERT IGNORE INTO roles_personas (nombre_rol_persona) VALUES ('APRENDIZ')
    `);
    await connection.query(`
      INSERT IGNORE INTO roles_personas (nombre_rol_persona) VALUES ('INSTRUCTOR')
    `);
    await connection.query(`
      INSERT IGNORE INTO roles_personas (nombre_rol_persona) VALUES ('ADMINISTRATIVO')
    `);
    await connection.query(`
      INSERT IGNORE INTO roles_personas (nombre_rol_persona) VALUES ('VISITANTE')
    `);
    await connection.query(`
      INSERT IGNORE INTO roles_personas (nombre_rol_persona) VALUES ('ESTUDIANTE')
    `);
    console.log('✅ Roles de personas creados\n');
    
    // Mostrar los roles y estados creados
    const [estados] = await connection.query('SELECT * FROM estados_personas ORDER BY id_estado_persona');
    const [roles] = await connection.query('SELECT * FROM roles_personas ORDER BY id_rol_persona');
    
    console.log('📋 Estados de personas:');
    estados.forEach(e => {
      console.log(`   ${e.id_estado_persona}. ${e.nombre_estado}`);
    });
    
    console.log('\n📋 Roles de personas:');
    roles.forEach(r => {
      console.log(`   ${r.id_rol_persona}. ${r.nombre_rol_persona}`);
    });
    
    console.log('\n✅ Roles y estados inicializados correctamente\n');
    
  } catch (error) {
    console.error('❌ Error al inicializar roles y estados:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

inicializarRolesEstados();

