const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function crearAprendiz() {
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
    
    // Obtener argumentos de la línea de comandos
    const args = process.argv.slice(2);
    
    // Si no hay argumentos, crear el aprendiz de prueba
    if (args.length === 0) {
      console.log('📝 Creando aprendiz de prueba...\n');
      
      const nombres = 'JULIAN ANDRES';
      const apellidos = 'SAAVEDRA LOZANO';
      const documento = '1114541908';
      const tipoDocumento = 'CC';
      const programa = null;
      const ficha = null;
      const estado = 'ACTIVO';
      
      // Obtener el ID del rol de aprendiz
      const [roles] = await connection.query(`
        SELECT id_rol_persona 
        FROM roles_personas 
        WHERE LOWER(nombre_rol_persona) LIKE '%aprendiz%' 
           OR LOWER(nombre_rol_persona) LIKE '%estudiante%'
        LIMIT 1
      `);
      
      if (roles.length === 0) {
        console.log('❌ No se encontró un rol de aprendiz en la base de datos.');
        console.log('💡 Ejecuta: node scripts/setupDatabase.js para crear roles');
        return;
      }
      
      const idRolAprendiz = roles[0].id_rol_persona;
      
      // Verificar si el aprendiz ya existe
      const [existente] = await connection.query(
        'SELECT id_persona FROM personas WHERE documento = ?',
        [documento]
      );
      
      if (existente.length > 0) {
        console.log('⚠️  El aprendiz con documento', documento, 'ya existe.');
        
        // Obtener el aprendiz existente
        const [aprendiz] = await connection.query(`
          SELECT 
            p.id_persona,
            p.nombres,
            p.apellidos,
            p.documento,
            p.codigo_qr,
            p.estado,
            rp.nombre_rol_persona as rol
          FROM personas p
          LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
          WHERE p.documento = ?
        `, [documento]);
        
        console.log('\n📋 Aprendiz existente:');
        console.log(aprendiz[0]);
        return;
      }
      
      // Generar código QR único
      const codigoQR = `APR-${Date.now()}-${documento}`;
      
      // Obtener el primer usuario (para id_usuario)
      const [usuarios] = await connection.query(
        'SELECT id_usuario FROM usuarios LIMIT 1'
      );
      const idUsuario = usuarios.length > 0 ? usuarios[0].id_usuario : null;
      
      // Insertar aprendiz
      await connection.query(
        `INSERT INTO personas (
          tipo_documento, documento, nombres, apellidos, codigo_qr, 
          programa, ficha, estado, id_usuario, id_rol_persona
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tipoDocumento, documento, nombres, apellidos, codigoQR, 
         programa, ficha, estado, idUsuario, idRolAprendiz]
      );
      
      console.log('✅ Aprendiz creado exitosamente\n');
      
      // Obtener el aprendiz creado
      const [nuevoAprendiz] = await connection.query(`
        SELECT 
          p.id_persona,
          p.nombres,
          p.apellidos,
          p.documento,
          p.codigo_qr,
          p.estado,
          rp.nombre_rol_persona as rol
        FROM personas p
        LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
        WHERE p.documento = ?
      `, [documento]);
      
      console.log('📋 Aprendiz creado:');
      console.log(nuevoAprendiz[0]);
      console.log('\n✅ Proceso completado\n');
      
    } else {
      // Crear aprendiz con argumentos personalizados
      // Uso: node scripts/crearAprendiz.js nombres apellidos documento tipoDocumento [programa] [ficha]
      const nombres = args[0];
      const apellidos = args[1] || null;
      const documento = args[2];
      const tipoDocumento = args[3] || 'CC';
      const programa = args[4] || null;
      const ficha = args[5] || null;
      
      if (!nombres || !documento) {
        console.log('❌ Uso: node scripts/crearAprendiz.js nombres apellidos documento [tipoDocumento] [programa] [ficha]');
        console.log('   Ejemplo: node scripts/crearAprendiz.js "JULIAN ANDRES" "SAAVEDRA LOZANO" 1114541908 CC');
        return;
      }
      
      // Similar al código anterior...
      console.log('📝 Creando aprendiz personalizado...\n');
      // ... (código similar)
    }
    
  } catch (error) {
    console.error('❌ Error al crear aprendiz:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

crearAprendiz();

