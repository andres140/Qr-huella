const db = require('../config/database');
require('dotenv').config();

async function consultarDB() {
  try {
    console.log('\n📊 CONSULTANDO BASE DE DATOS...\n');
    
    // Consultar roles de personas
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 ROLES DE PERSONAS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const [roles] = await db.query('SELECT * FROM roles_personas');
    if (roles.length === 0) {
      console.log('   (No hay roles registrados)');
    } else {
      roles.forEach((r, index) => {
        console.log(`   ${index + 1}. ID: ${r.id_rol_persona} - ${r.nombre_rol_persona}`);
      });
    }
    
    // Consultar estados de personas
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ESTADOS DE PERSONAS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const [estados] = await db.query('SELECT * FROM estados_personas');
    if (estados.length === 0) {
      console.log('   (No hay estados registrados)');
    } else {
      estados.forEach((e, index) => {
        console.log(`   ${index + 1}. ID: ${e.id_estado_persona} - ${e.nombre_estado}`);
      });
    }
    
    // Consultar todas las personas
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 PERSONAS REGISTRADAS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const [personas] = await db.query(`
      SELECT 
        p.id_persona,
        p.nombres,
        p.apellidos,
        p.documento,
        p.codigo_qr,
        p.estado,
        p.programa,
        p.ficha,
        rp.nombre_rol_persona as rol,
        ep.nombre_estado as estado_persona
      FROM personas p
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
      ORDER BY p.id_persona DESC
      LIMIT 50
    `);
    if (personas.length === 0) {
      console.log('   (No hay personas registradas)');
    } else {
      console.log(`   Total: ${personas.length} persona(s)\n`);
      personas.forEach((p, index) => {
        console.log(`   ${index + 1}. ${p.nombres} ${p.apellidos || ''}`);
        console.log(`      ID: ${p.id_persona}`);
        console.log(`      Documento: ${p.documento}`);
        console.log(`      QR: ${p.codigo_qr || 'N/A'}`);
        console.log(`      Estado: ${p.estado}`);
        console.log(`      Estado Persona: ${p.estado_persona || 'N/A'}`);
        console.log(`      Rol: ${p.rol || 'N/A'}`);
        if (p.programa) console.log(`      Programa: ${p.programa}`);
        if (p.ficha) console.log(`      Ficha: ${p.ficha}`);
        console.log('');
      });
    }
    
    // Consultar registros de entrada/salida
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 REGISTROS DE ENTRADA/SALIDA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const [registros] = await db.query(`
      SELECT 
        r.id_registro_entrada_salida as id,
        r.tipo,
        r.fecha_entrada,
        r.fecha_salida,
        p.nombres,
        p.apellidos,
        p.documento
      FROM registros_entrada_salida r
      LEFT JOIN personas p ON r.id_persona = p.id_persona
      ORDER BY COALESCE(r.fecha_entrada, r.fecha_salida) DESC
      LIMIT 30
    `);
    
    if (registros.length === 0) {
      console.log('   (No hay registros de entrada/salida)');
    } else {
      console.log(`   Total: ${registros.length} registro(s)\n`);
      registros.forEach((reg, index) => {
        console.log(`   ${index + 1}. ${reg.tipo} - ${reg.nombres} ${reg.apellidos || ''}`);
        console.log(`      Documento: ${reg.documento}`);
        console.log(`      Fecha entrada: ${reg.fecha_entrada || 'N/A'}`);
        console.log(`      Fecha salida: ${reg.fecha_salida || 'N/A'}`);
        console.log('');
      });
    }
    
    // Consultar usuarios
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 USUARIOS DEL SISTEMA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const [usuarios] = await db.query(`
      SELECT id_usuario, nombre, email, rol, estado, fecha_creacion, ultimo_acceso 
      FROM usuarios
      ORDER BY id_usuario
    `);
    if (usuarios.length === 0) {
      console.log('   (No hay usuarios registrados)');
    } else {
      console.log(`   Total: ${usuarios.length} usuario(s)\n`);
      usuarios.forEach((u, index) => {
        console.log(`   ${index + 1}. ${u.nombre}`);
        console.log(`      ID: ${u.id_usuario}`);
        console.log(`      Email: ${u.email}`);
        console.log(`      Rol: ${u.rol}`);
        console.log(`      Estado: ${u.estado}`);
        console.log(`      Fecha creación: ${u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleString('es-ES') : 'N/A'}`);
        console.log(`      Último acceso: ${u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-ES') : 'N/A'}`);
        console.log('');
      });
    }
    
    // Estadísticas
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ESTADÍSTICAS GENERALES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM personas) as total_personas,
        (SELECT COUNT(*) FROM personas WHERE estado = 'ACTIVO') as personas_activas,
        (SELECT COUNT(*) FROM registros_entrada_salida) as total_registros,
        (SELECT COUNT(*) FROM registros_entrada_salida 
         WHERE DATE(fecha_entrada) = CURDATE() OR DATE(fecha_salida) = CURDATE()) as registros_hoy,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE estado = 'ACTIVO') as usuarios_activos
    `);
    
    console.log(`\n   👥 Total personas: ${stats[0].total_personas}`);
    console.log(`   ✅ Personas activas: ${stats[0].personas_activas}`);
    console.log(`   📝 Total registros: ${stats[0].total_registros}`);
    console.log(`   📅 Registros hoy: ${stats[0].registros_hoy}`);
    console.log(`   👤 Total usuarios: ${stats[0].total_usuarios}`);
    console.log(`   ✅ Usuarios activos: ${stats[0].usuarios_activos}`);
    
    console.log('\n✅ Consulta completada\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

consultarDB();
