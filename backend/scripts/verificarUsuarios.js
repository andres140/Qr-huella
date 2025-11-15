const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function verificarUsuarios() {
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
    
    // Verificar usuarios
    const [usuarios] = await connection.query(`
      SELECT id_usuario, nombre, email, rol, estado, 
             CASE WHEN passwords IS NULL OR passwords = '' THEN 'NO' ELSE 'SI' END as tiene_password
      FROM usuarios
      ORDER BY id_usuario
    `);
    
    if (usuarios.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      console.log('💡 Ejecuta: node scripts/setupDatabase.js para crear usuarios por defecto');
      return;
    }
    
    console.log('📋 USUARIOS EN LA BASE DE DATOS:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const usuario of usuarios) {
      console.log(`\n👤 ${usuario.nombre}`);
      console.log(`   ID: ${usuario.id_usuario}`);
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Rol: ${usuario.rol}`);
      console.log(`   Estado: ${usuario.estado}`);
      console.log(`   Tiene contraseña: ${usuario.tiene_password}`);
      
      // Verificar contraseñas por defecto
      if (usuario.email === 'admin@sena.edu.co' || usuario.email === 'guarda@sena.edu.co') {
        const [usuarioCompleto] = await connection.query(
          'SELECT passwords FROM usuarios WHERE id_usuario = ?',
          [usuario.id_usuario]
        );
        
        if (usuarioCompleto[0]?.passwords) {
          const passwordEsperada = usuario.email === 'admin@sena.edu.co' ? 'admin123' : 'guarda123';
          const passwordValida = await bcrypt.compare(passwordEsperada, usuarioCompleto[0].passwords);
          
          console.log(`   Contraseña por defecto: ${passwordValida ? '✅ Válida' : '❌ No coincide'}`);
          console.log(`   Contraseña esperada: ${passwordEsperada}`);
        }
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Total: ${usuarios.length} usuario(s)`);
    console.log(`   Activos: ${usuarios.filter(u => u.estado === 'ACTIVO').length}`);
    console.log(`   Inactivos: ${usuarios.filter(u => u.estado === 'INACTIVO').length}`);
    
    console.log('\n✅ Verificación completada\n');
    
  } catch (error) {
    console.error('❌ Error al verificar usuarios:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificarUsuarios();

