const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function crearUsuario() {
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
    const email = args[0] || 'sasa@gmail.com';
    const password = args[1] || 'prueba123';
    const nombre = args[2] || 'Usuario de Prueba';
    const rol = args[3] || 'GUARDA';
    
    console.log(`\n📝 Creando usuario:`);
    console.log(`   Email: ${email}`);
    console.log(`   Nombre: ${nombre}`);
    console.log(`   Rol: ${rol}`);
    
    // Verificar si el usuario ya existe
    const [existentes] = await connection.query(
      'SELECT id_usuario, email FROM usuarios WHERE email = ?',
      [email]
    );
    
    if (existentes.length > 0) {
      console.log(`\n⚠️  El usuario ${email} ya existe.`);
      console.log('   Para actualizar la contraseña, usa: node scripts/crearUsuario.js email nueva_password');
      
      // Preguntar si quiere actualizar la contraseña
      const [usuarios] = await connection.query(
        'SELECT id_usuario, nombre, email, rol, estado FROM usuarios WHERE email = ?',
        [email]
      );
      console.log('\n📋 Usuario existente:');
      console.log(usuarios[0]);
      return;
    }
    
    // Hashear contraseña
    console.log('\n🔐 Hasheando contraseña...');
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insertar usuario
    await connection.query(
      `INSERT INTO usuarios (nombre, email, passwords, rol, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, email, passwordHash, rol, 'ACTIVO']
    );
    
    console.log('✅ Usuario creado exitosamente');
    
    // Obtener el usuario creado
    const [nuevoUsuario] = await connection.query(
      'SELECT id_usuario, nombre, email, rol, estado, fecha_creacion FROM usuarios WHERE email = ?',
      [email]
    );
    
    console.log('\n📋 Usuario creado:');
    console.log(nuevoUsuario[0]);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Usuario creado correctamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Credenciales de acceso:');
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}`);
    console.log(`   Rol: ${rol}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error al crear usuario:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

crearUsuario();

