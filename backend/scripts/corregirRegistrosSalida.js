const mysql = require('mysql2/promise');
require('dotenv').config();

async function corregirRegistrosSalida() {
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
    
    // Verificar cuántos registros necesitan corrección
    const [registrosIncorrectos] = await connection.query(
      `SELECT COUNT(*) as total 
       FROM registros_entrada_salida 
       WHERE tipo = 'ENTRADA' AND fecha_salida IS NOT NULL`
    );
    
    const totalIncorrectos = registrosIncorrectos[0].total;
    console.log(`\n📊 Registros que necesitan corrección: ${totalIncorrectos}`);
    
    if (totalIncorrectos === 0) {
      console.log('✅ No hay registros que corregir. Todo está correcto.');
      return;
    }
    
    // Mostrar los registros que se van a corregir
    const [registros] = await connection.query(
      `SELECT 
        r.id_registro_entrada_salida,
        r.id_persona,
        r.tipo,
        r.fecha_entrada,
        r.fecha_salida,
        p.nombres,
        p.apellidos,
        p.documento
       FROM registros_entrada_salida r
       INNER JOIN personas p ON r.id_persona = p.id_persona
       WHERE r.tipo = 'ENTRADA' AND r.fecha_salida IS NOT NULL
       ORDER BY COALESCE(r.fecha_entrada, r.fecha_salida) DESC
       LIMIT 10`
    );
    
    console.log('\n📋 Primeros registros a corregir:');
    registros.forEach((reg, index) => {
      console.log(`   ${index + 1}. ${reg.nombres} ${reg.apellidos || ''} - ${reg.documento}`);
      console.log(`      ID: ${reg.id_registro_entrada_salida}, Tipo: ${reg.tipo}, Fecha entrada: ${reg.fecha_entrada}, Fecha salida: ${reg.fecha_salida}`);
    });
    
    if (totalIncorrectos > 10) {
      console.log(`   ... y ${totalIncorrectos - 10} más`);
    }
    
    // Corregir los registros
    console.log('\n🔄 Corrigiendo registros...');
    const [resultado] = await connection.query(
      `UPDATE registros_entrada_salida 
       SET tipo = 'SALIDA' 
       WHERE tipo = 'ENTRADA' AND fecha_salida IS NOT NULL`
    );
    
    console.log(`✅ Registros corregidos: ${resultado.affectedRows}`);
    
    // Verificar que se corrigieron correctamente
    const [verificacion] = await connection.query(
      `SELECT COUNT(*) as total 
       FROM registros_entrada_salida 
       WHERE tipo = 'ENTRADA' AND fecha_salida IS NOT NULL`
    );
    
    const totalAunIncorrectos = verificacion[0].total;
    
    if (totalAunIncorrectos === 0) {
      console.log('✅ Todos los registros fueron corregidos exitosamente.');
    } else {
      console.log(`⚠️  Aún quedan ${totalAunIncorrectos} registros incorrectos.`);
    }
    
    // Mostrar estadísticas finales
    const [estadisticas] = await connection.query(
      `SELECT 
        tipo,
        COUNT(*) as total
       FROM registros_entrada_salida
       GROUP BY tipo`
    );
    
    console.log('\n📊 Estadísticas de registros:');
    estadisticas.forEach(stat => {
      console.log(`   ${stat.tipo}: ${stat.total}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Corrección completada');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error al corregir registros:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

corregirRegistrosSalida();

