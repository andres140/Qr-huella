const mysql = require('mysql2/promise');
require('dotenv').config();

async function limpiarAprendices() {
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
    const fechaDesde = args[0] || null; // Formato: YYYY-MM-DD HH:MM:SS
    
    // Obtener el ID del rol de aprendiz
    const [roles] = await connection.query(`
      SELECT id_rol_persona 
      FROM roles_personas 
      WHERE LOWER(nombre_rol_persona) LIKE '%aprendiz%' 
         OR LOWER(nombre_rol_persona) LIKE '%estudiante%'
      LIMIT 1
    `);
    
    if (roles.length === 0) {
      console.log('⚠️ No se encontró el rol de aprendiz');
      return;
    }
    
    const idRolAprendiz = roles[0].id_rol_persona;
    console.log(`📋 ID del rol de aprendiz: ${idRolAprendiz}`);
    
    // Contar aprendices antes de eliminar
    let queryCount = `
      SELECT COUNT(*) as total 
      FROM personas 
      WHERE id_rol_persona = ?
    `;
    let paramsCount = [idRolAprendiz];
    
    if (fechaDesde) {
      queryCount += ' AND fecha_registro >= ?';
      paramsCount.push(fechaDesde);
      console.log(`📅 Eliminando aprendices creados desde: ${fechaDesde}`);
    } else {
      console.log('⚠️ ADVERTENCIA: Se eliminarán TODOS los aprendices');
    }
    
    const [countBefore] = await connection.query(queryCount, paramsCount);
    const totalBefore = countBefore[0].total;
    console.log(`📊 Total de aprendices a eliminar: ${totalBefore}`);
    
    if (totalBefore === 0) {
      console.log('✅ No hay aprendices para eliminar');
      return;
    }
    
    // Confirmar eliminación
    console.log('\n⚠️  ADVERTENCIA: Esta operación eliminará aprendices de la base de datos.');
    console.log('   Presiona Ctrl+C para cancelar o espera 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Obtener IDs de aprendices a eliminar
    let queryIds = `
      SELECT id_persona 
      FROM personas 
      WHERE id_rol_persona = ?
    `;
    let paramsIds = [idRolAprendiz];
    
    if (fechaDesde) {
      queryIds += ' AND fecha_registro >= ?';
      paramsIds.push(fechaDesde);
    }
    
    const [aprendices] = await connection.query(queryIds, paramsIds);
    const ids = aprendices.map(a => a.id_persona);
    
    if (ids.length === 0) {
      console.log('✅ No hay aprendices para eliminar');
      return;
    }
    
    console.log(`🗑️  Eliminando ${ids.length} aprendices...`);
    
    // Eliminar registros de entrada/salida primero (por las foreign keys)
    const [resultEntradas] = await connection.query(
      'DELETE FROM registros_entrada_salida WHERE id_persona IN (?)',
      [ids]
    );
    console.log(`   ✅ Eliminados ${resultEntradas.affectedRows} registros de entrada/salida`);
    
    // Eliminar aprendices
    let queryDelete = 'DELETE FROM personas WHERE id_persona IN (?)';
    const [result] = await connection.query(queryDelete, [ids]);
    
    console.log(`✅ Eliminados ${result.affectedRows} aprendices`);
    
    // Contar aprendices restantes
    const [countAfter] = await connection.query(
      'SELECT COUNT(*) as total FROM personas WHERE id_rol_persona = ?',
      [idRolAprendiz]
    );
    console.log(`📊 Aprendices restantes: ${countAfter[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

limpiarAprendices();

