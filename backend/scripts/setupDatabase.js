const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔄 Conectando a MySQL...');
    
    // Conectar sin especificar base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    
    console.log('✅ Conectado a MySQL');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../database/schema.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔄 Ejecutando script SQL...');
    
    // Ejecutar el script SQL
    await connection.query(sql);
    
    console.log('✅ Base de datos creada exitosamente');
    
    // Conectar a la base de datos
    await connection.query(`USE ${process.env.DB_NAME || 'sena_acceso'}`);
    
    // Insertar estados de personas iniciales
    console.log('🔄 Creando estados de personas...');
    await connection.query(`
      INSERT INTO estados_personas (nombre_estado) VALUES ('ACTIVO')
      ON DUPLICATE KEY UPDATE nombre_estado = nombre_estado
    `);
    await connection.query(`
      INSERT INTO estados_personas (nombre_estado) VALUES ('INACTIVO')
      ON DUPLICATE KEY UPDATE nombre_estado = nombre_estado
    `);
    await connection.query(`
      INSERT INTO estados_personas (nombre_estado) VALUES ('EN FORMACION')
      ON DUPLICATE KEY UPDATE nombre_estado = nombre_estado
    `);
    await connection.query(`
      INSERT INTO estados_personas (nombre_estado) VALUES ('APLAZADO')
      ON DUPLICATE KEY UPDATE nombre_estado = nombre_estado
    `);
    console.log('✅ Estados de personas creados');
    
    // Insertar roles de personas iniciales
    console.log('🔄 Creando roles de personas...');
    await connection.query(`
      INSERT INTO roles_personas (nombre_rol_persona) VALUES ('APRENDIZ')
      ON DUPLICATE KEY UPDATE nombre_rol_persona = nombre_rol_persona
    `);
    await connection.query(`
      INSERT INTO roles_personas (nombre_rol_persona) VALUES ('INSTRUCTOR')
      ON DUPLICATE KEY UPDATE nombre_rol_persona = nombre_rol_persona
    `);
    await connection.query(`
      INSERT INTO roles_personas (nombre_rol_persona) VALUES ('ADMINISTRATIVO')
      ON DUPLICATE KEY UPDATE nombre_rol_persona = nombre_rol_persona
    `);
    await connection.query(`
      INSERT INTO roles_personas (nombre_rol_persona) VALUES ('VISITANTE')
      ON DUPLICATE KEY UPDATE nombre_rol_persona = nombre_rol_persona
    `);
    await connection.query(`
      INSERT INTO roles_personas (nombre_rol_persona) VALUES ('ESTUDIANTE')
      ON DUPLICATE KEY UPDATE nombre_rol_persona = nombre_rol_persona
    `);
    console.log('✅ Roles de personas creados');
    
    // Crear usuario administrador por defecto
    console.log('🔄 Creando usuario administrador...');
    
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await connection.query(`
      INSERT INTO usuarios (nombre, email, passwords, rol, estado) 
      VALUES ('Administrador del Sistema', 'admin@sena.edu.co', ?, 'ADMINISTRADOR', 'ACTIVO')
      ON DUPLICATE KEY UPDATE id_usuario = id_usuario
    `, [passwordHash]);
    
    console.log('✅ Usuario administrador creado');
    
    // Crear usuario guarda de ejemplo
    const guardaPasswordHash = await bcrypt.hash('guarda123', 10);
    await connection.query(`
      INSERT INTO usuarios (nombre, email, passwords, rol, estado) 
      VALUES ('Guarda de Seguridad', 'guarda@sena.edu.co', ?, 'GUARDA', 'ACTIVO')
      ON DUPLICATE KEY UPDATE id_usuario = id_usuario
    `, [guardaPasswordHash]);
    
    console.log('✅ Usuario guarda creado');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Base de datos configurada correctamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 Credenciales de acceso:');
    console.log('');
    console.log('   👤 Administrador:');
    console.log('      Email: admin@sena.edu.co');
    console.log('      Contraseña: admin123');
    console.log('');
    console.log('   🛡️  Guarda:');
    console.log('      Email: guarda@sena.edu.co');
    console.log('      Contraseña: guarda123');
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia las contraseñas después del primer inicio de sesión');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error al configurar la base de datos:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
