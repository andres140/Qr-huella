const db = require('../config/database');
require('dotenv').config();

async function consultarUsuarios() {
  try {
    console.log('\n👥 CONSULTANDO USUARIOS EN LA BASE DE DATOS...\n');
    
    const [usuarios] = await db.query('SELECT id, usuario, nombre, email, rol, estado FROM usuarios');
    
    if (usuarios.length === 0) {
      console.log('   (No hay usuarios registrados)');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      usuarios.forEach((u, index) => {
        console.log(`\n   ${index + 1}. Usuario: ${u.usuario}`);
        console.log(`      Nombre: ${u.nombre}`);
        console.log(`      Email: ${u.email}`);
        console.log(`      Rol: ${u.rol}`);
        console.log(`      Estado: ${u.estado}`);
      });
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📋 Para hacer login puedes usar:');
      console.log(`   - Usuario: ${usuarios[0].usuario}`);
      console.log(`   - Email: ${usuarios[0].email}`);
      console.log('\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al consultar usuarios:', error.message);
    process.exit(1);
  }
}

consultarUsuarios();

