const mysql = require('mysql2/promise');
require('dotenv').config();

async function verificarAprendicesSinFicha() {
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
    
    // Buscar aprendices sin ficha o con ficha NULL/vacía
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 Aprendices sin ficha o con ficha NULL/vacía:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [sinFicha] = await connection.query(`
      SELECT 
        p.id_persona,
        p.documento,
        p.nombres,
        p.apellidos,
        p.ficha,
        p.programa,
        p.fecha_registro
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
        AND (p.ficha IS NULL OR p.ficha = '' OR p.ficha = 'N/A')
      ORDER BY p.fecha_registro DESC
      LIMIT 50
    `);
    
    console.log(`   Encontrados: ${sinFicha.length} aprendices sin ficha\n`);
    
    if (sinFicha.length > 0) {
      sinFicha.forEach((a, idx) => {
        console.log(`   ${idx + 1}. ${a.nombres} ${a.apellidos} - Doc: ${a.documento}`);
        console.log(`      Ficha: "${a.ficha || 'NULL'}" | Programa: "${a.programa || 'NULL'}"`);
        console.log(`      Fecha registro: ${a.fecha_registro}`);
        console.log('');
      });
    } else {
      console.log('   ✅ Todos los aprendices tienen ficha asignada\n');
    }
    
    // Buscar aprendices que podrían tener la ficha 2928088 pero se guardó mal
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 Buscando fichas que contengan "2928088":`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [conFichaSimilar] = await connection.query(`
      SELECT 
        p.id_persona,
        p.documento,
        p.nombres,
        p.apellidos,
        p.ficha,
        p.programa
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
        AND p.ficha LIKE '%2928088%'
      ORDER BY p.nombres
    `);
    
    console.log(`   Encontrados: ${conFichaSimilar.length} aprendices\n`);
    
    if (conFichaSimilar.length > 0) {
      conFichaSimilar.forEach((a, idx) => {
        console.log(`   ${idx + 1}. ${a.nombres} ${a.apellidos} - Doc: ${a.documento}`);
        console.log(`      Ficha: "${a.ficha}"`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

verificarAprendicesSinFicha();

