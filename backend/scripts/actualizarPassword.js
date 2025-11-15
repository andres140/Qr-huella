const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function actualizarPassword() {
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
    
    // Obtener argumentos de la línea de comandos
    const args = process.argv.slice(2);
    const email = args[0] || 'guarda@sena.edu.co';
    const password = args[1] || 'guarda123';
    
    console.log(`\n📝 Actualizando contraseña para:`);
    console.log(`   Email: ${email}`);
    
    // Verificar si el usuario existe
    const [existentes] = await connection.query(
      'SELECT id_usuario, email, nombre, rol FROM usuarios WHERE email = ?',
      [email]
    );
    
    if (existentes.length === 0) {
      console.log(`\n❌ El usuario ${email} no existe.`);
      console.log('   Crea el usuario primero con: node scripts/crearUsuario.js');
      return;
    }
    
    const usuario = existentes[0];
    console.log(`\n📋 Usuario encontrado:`);
    console.log(`   ID: ${usuario.id_usuario}`);
    console.log(`   Nombre: ${usuario.nombre}`);
    console.log(`   Rol: ${usuario.rol}`);
    
    // Hashear nueva contraseña
    console.log('\n🔐 Hasheando nueva contraseña...');
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Actualizar contraseña
    await connection.query(
      `UPDATE usuarios SET passwords = ? WHERE email = ?`,
      [passwordHash, email]
    );
    
    console.log('✅ Contraseña actualizada exitosamente');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Contraseña actualizada correctamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Credenciales de acceso:');
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error al actualizar contraseña:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

actualizarPassword();


