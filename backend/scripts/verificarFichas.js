const mysql = require('mysql2/promise');
require('dotenv').config();

async function verificarFichas() {
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
    
    // Buscar fichas específicas
    const fichasBuscar = ['3315672', '2928088'];
    
    for (const ficha of fichasBuscar) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔍 Buscando aprendices con ficha: ${ficha}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      const [aprendices] = await connection.query(`
        SELECT 
          p.id_persona,
          p.documento,
          p.nombres,
          p.apellidos,
          p.ficha,
          p.programa,
          CAST(p.ficha AS CHAR) as ficha_char,
          TRIM(CAST(p.ficha AS CHAR)) as ficha_trim,
          LENGTH(p.ficha) as ficha_length,
          p.ficha = ? as comparacion_directa,
          TRIM(CAST(p.ficha AS CHAR)) = ? as comparacion_trim
        FROM personas p
        INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
        WHERE (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
          AND p.ficha IS NOT NULL
          AND p.ficha != ''
        HAVING ficha_trim = ?
        ORDER BY p.nombres
      `, [ficha, ficha, ficha]);
      
      console.log(`   Encontrados: ${aprendices.length} aprendices\n`);
      
      if (aprendices.length > 0) {
        aprendices.forEach((a, idx) => {
          console.log(`   ${idx + 1}. ${a.nombres} ${a.apellidos} - Doc: ${a.documento}`);
          console.log(`      Ficha original: "${a.ficha}" (tipo: ${typeof a.ficha}, longitud: ${a.ficha_length})`);
          console.log(`      Ficha como CHAR: "${a.ficha_char}"`);
          console.log(`      Ficha TRIM: "${a.ficha_trim}"`);
          console.log(`      Comparación directa: ${a.comparacion_directa}`);
          console.log(`      Comparación TRIM: ${a.comparacion_trim}`);
          console.log('');
        });
      } else {
        console.log('   ⚠️ No se encontraron aprendices con esta ficha\n');
      }
    }
    
    // Mostrar todas las fichas únicas
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Todas las fichas únicas en la BD:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [fichas] = await connection.query(`
      SELECT 
        p.ficha,
        CAST(p.ficha AS CHAR) as ficha_char,
        TRIM(CAST(p.ficha AS CHAR)) as ficha_trim,
        COUNT(*) as cantidad
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
        AND p.ficha IS NOT NULL
        AND p.ficha != ''
      GROUP BY p.ficha
      ORDER BY cantidad DESC
      LIMIT 20
    `);
    
    fichas.forEach((f, idx) => {
      console.log(`   ${idx + 1}. Ficha: "${f.ficha}" -> TRIM: "${f.ficha_trim}" (${f.cantidad} aprendices)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

verificarFichas();

