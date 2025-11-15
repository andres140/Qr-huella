const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function verificarPassword() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'sena_acceso'
  });

  const [user] = await conn.query('SELECT email, passwords FROM usuarios WHERE email = ?', ['guarda@sena.edu.co']);
  
  console.log('📋 Usuario encontrado:', user[0].email);
  console.log('🔐 Hash almacenado:', user[0].passwords.substring(0, 30) + '...');
  
  // Obtener la contraseña deseada desde los argumentos de línea de comandos, o usar '123456' por defecto
  const args = process.argv.slice(2);
  const nuevaPassword = args[0] || '123456';
  
  const testPasswords = ['guarda123', '123456', 'guarda123456', 'guarda'];
  console.log('\n🔍 Verificando contraseñas existentes:');
  for (const pwd of testPasswords) {
    const match = await bcrypt.compare(pwd, user[0].passwords);
    console.log(`   Contraseña '${pwd}': ${match ? '✅ CORRECTA' : '❌ INCORRECTA'}`);
  }
  
  // Actualizar con la contraseña nueva
  console.log(`\n🔄 Actualizando contraseña a "${nuevaPassword}"...`);
  const newHash = await bcrypt.hash(nuevaPassword, 10);
  await conn.query('UPDATE usuarios SET passwords = ? WHERE email = ?', [newHash, 'guarda@sena.edu.co']);
  console.log('✅ Contraseña actualizada');
  
  // Verificar que la contraseña se actualizó correctamente
  const [updatedUser] = await conn.query('SELECT passwords FROM usuarios WHERE email = ?', ['guarda@sena.edu.co']);
  const verify = await bcrypt.compare(nuevaPassword, updatedUser[0].passwords);
  console.log(`✅ Verificación final con "${nuevaPassword}":`, verify ? 'CORRECTA' : 'INCORRECTA');
  
  if (verify) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Contraseña actualizada correctamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📋 Credenciales actualizadas:`);
    console.log(`   Email: guarda@sena.edu.co`);
    console.log(`   Contraseña: ${nuevaPassword}`);
    console.log('');
  }
  
  await conn.end();
}

verificarPassword();




