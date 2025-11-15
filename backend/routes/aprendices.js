const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken } = require('./auth');

// Middleware de autenticación
router.use(verificarToken);

// Obtener todos los aprendices (personas con rol de aprendiz)
router.get('/', async (req, res) => {
  try {
    const { estado, buscar } = req.query;
    
    // Primero obtener el ID del rol "APRENDIZ" o similar
    let query = `
      SELECT 
        p.id_persona as id,
        p.tipo_documento as tipoDocumento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr as codigoQR,
        p.programa,
        p.ficha,
        p.estado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%'
    `;
    const params = [];
    
    if (estado && estado !== 'TODOS') {
      query += ' AND p.estado = ?';
      params.push(estado);
    }
    
    if (buscar) {
      query += ' AND (p.nombres LIKE ? OR p.apellidos LIKE ? OR p.documento LIKE ?)';
      const buscarParam = `%${buscar}%`;
      params.push(buscarParam, buscarParam, buscarParam);
    }
    
    query += ' ORDER BY p.nombres ASC';
    
    const [aprendices] = await db.query(query, params);
    
    // Mapear para compatibilidad
    const aprendicesMapeados = aprendices.map(a => ({
      id: a.id,
      nombre: a.nombres,
      apellido: a.apellidos,
      nombres: a.nombres,
      apellidos: a.apellidos,
      documento: a.documento,
      tipoDocumento: a.tipoDocumento,
      codigoQR: a.codigoQR,
      programa: a.programa,
      ficha: a.ficha,
      estado: a.estado,
      rol: a.rol
    }));
    
    res.json({ success: true, data: aprendicesMapeados });
  } catch (error) {
    console.error('Error al obtener aprendices:', error);
    res.status(500).json({ error: true, message: 'Error al obtener aprendices' });
  }
});

// Obtener aprendiz por ID
router.get('/:id', async (req, res) => {
  try {
    const [aprendices] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.tipo_documento as tipoDocumento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr as codigoQR,
        p.programa,
        p.ficha,
        p.estado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ? 
        AND (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
    `, [req.params.id]);
    
    if (aprendices.length === 0) {
      return res.status(404).json({ error: true, message: 'Aprendiz no encontrado' });
    }
    
    const a = aprendices[0];
    res.json({ 
      success: true, 
      data: {
        id: a.id,
        nombre: a.nombres,
        apellido: a.apellidos,
        nombres: a.nombres,
        apellidos: a.apellidos,
        documento: a.documento,
        tipoDocumento: a.tipoDocumento,
        codigoQR: a.codigoQR,
        programa: a.programa,
        ficha: a.ficha,
        estado: a.estado,
        rol: a.rol
      }
    });
  } catch (error) {
    console.error('Error al obtener aprendiz:', error);
    res.status(500).json({ error: true, message: 'Error al obtener aprendiz' });
  }
});

// Buscar aprendiz por código QR
router.get('/qr/:codigoQR', async (req, res) => {
  try {
    const [aprendices] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.tipo_documento as tipoDocumento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr as codigoQR,
        p.programa,
        p.ficha,
        p.estado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.codigo_qr = ? 
        AND (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
    `, [req.params.codigoQR]);
    
    if (aprendices.length === 0) {
      return res.status(404).json({ error: true, message: 'Aprendiz no encontrado' });
    }
    
    const a = aprendices[0];
    res.json({ 
      success: true, 
      data: {
        id: a.id,
        nombre: a.nombres,
        apellido: a.apellidos,
        nombres: a.nombres,
        apellidos: a.apellidos,
        documento: a.documento,
        tipoDocumento: a.tipoDocumento,
        codigoQR: a.codigoQR,
        programa: a.programa,
        ficha: a.ficha,
        estado: a.estado,
        rol: a.rol
      }
    });
  } catch (error) {
    console.error('Error al buscar aprendiz por QR:', error);
    res.status(500).json({ error: true, message: 'Error al buscar aprendiz por QR' });
  }
});

// Buscar aprendiz por documento
router.get('/documento/:documento', async (req, res) => {
  try {
    const [aprendices] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.tipo_documento as tipoDocumento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr as codigoQR,
        p.programa,
        p.ficha,
        p.estado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.documento = ? 
        AND (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
    `, [req.params.documento]);
    
    if (aprendices.length === 0) {
      return res.status(404).json({ error: true, message: 'Aprendiz no encontrado' });
    }
    
    const a = aprendices[0];
    res.json({ 
      success: true, 
      data: {
        id: a.id,
        nombre: a.nombres,
        apellido: a.apellidos,
        nombres: a.nombres,
        apellidos: a.apellidos,
        documento: a.documento,
        tipoDocumento: a.tipoDocumento,
        codigoQR: a.codigoQR,
        programa: a.programa,
        ficha: a.ficha,
        estado: a.estado,
        rol: a.rol
      }
    });
  } catch (error) {
    console.error('Error al buscar aprendiz:', error);
    res.status(500).json({ error: true, message: 'Error al buscar aprendiz' });
  }
});

// Registrar nuevo aprendiz
router.post('/', async (req, res) => {
  try {
    console.log('📝 Intentando crear aprendiz...');
    console.log('Body recibido:', req.body);
    
    const {
      nombre,
      apellido,
      documento,
      tipoDocumento,
      programa,
      ficha,
      estado
    } = req.body;
    
    // Validaciones
    if (!nombre || !documento || !tipoDocumento) {
      console.log('❌ Validación fallida: campos requeridos faltantes');
      return res.status(400).json({ 
        error: true, 
        message: 'Campos requeridos: nombre, documento, tipoDocumento' 
      });
    }
    
    // Limpiar y validar documento - solo números, máximo 50 caracteres
    let documentoLimpio = String(documento).trim();
    const soloNumeros = documentoLimpio.replace(/\D/g, '');
    if (soloNumeros.length > 0) {
      documentoLimpio = soloNumeros;
    }
    
    // Limitar a 50 caracteres
    if (documentoLimpio.length > 50) {
      documentoLimpio = documentoLimpio.substring(0, 50);
      console.log('⚠️ Documento truncado a 50 caracteres:', documentoLimpio);
    }
    
    if (!documentoLimpio || documentoLimpio.length < 5) {
      return res.status(400).json({ 
        error: true, 
        message: 'Documento inválido. Debe contener al menos 5 dígitos.' 
      });
    }
    
    // Limitar nombres también
    const nombresLimpio = String(nombre).trim().substring(0, 100);
    const apellidosLimpio = apellido ? String(apellido).trim().substring(0, 100) : null;
    const programaLimpio = programa ? String(programa).trim().substring(0, 200) : null;
    const fichaLimpia = ficha ? String(ficha).trim().substring(0, 50) : null;
    
    // Validar estado
    let estadoLimpio = estado || 'ACTIVO';
    estadoLimpio = String(estadoLimpio).toUpperCase().trim();
    if (!['ACTIVO', 'INACTIVO'].includes(estadoLimpio)) {
      console.log(`⚠️ Estado inválido "${estado}", usando 'ACTIVO' por defecto`);
      estadoLimpio = 'ACTIVO';
    }
    
    console.log('📝 Datos limpios para insertar:', {
      nombres: nombresLimpio,
      documento: documentoLimpio,
      tipoDocumento,
      estado: estadoLimpio
    });
    
    // Verificar si el documento ya existe
    const [existente] = await db.query('SELECT id_persona FROM personas WHERE documento = ?', [documentoLimpio]);
    if (existente.length > 0) {
      console.log('❌ Documento ya existe:', documentoLimpio);
      return res.status(400).json({ error: true, message: 'El documento ya está registrado' });
    }
    
    // Obtener el ID del rol de aprendiz
    let [roles] = await db.query(`
      SELECT id_rol_persona 
      FROM roles_personas 
      WHERE LOWER(nombre_rol_persona) LIKE '%aprendiz%' 
         OR LOWER(nombre_rol_persona) LIKE '%estudiante%'
      LIMIT 1
    `);
    
    // Si no existe el rol APRENDIZ o ESTUDIANTE, crear APRENDIZ automáticamente
    if (roles.length === 0) {
      console.log('⚠️ Rol APRENDIZ no existe. Creándolo automáticamente...');
      await db.query(
        'INSERT INTO roles_personas (nombre_rol_persona) VALUES (?)',
        ['APRENDIZ']
      );
      [roles] = await db.query(`
        SELECT id_rol_persona 
        FROM roles_personas 
        WHERE LOWER(nombre_rol_persona) LIKE '%aprendiz%' 
           OR LOWER(nombre_rol_persona) LIKE '%estudiante%'
        LIMIT 1
      `);
      console.log('✅ Rol APRENDIZ creado automáticamente');
    }
    
    if (roles.length === 0) {
      return res.status(500).json({ 
        error: true, 
        message: 'Error al crear o obtener el rol de aprendiz' 
      });
    }
    
    const idRolAprendiz = roles[0].id_rol_persona;
    
    // Generar código QR único para el aprendiz
    const codigoQR = `APR-${Date.now()}-${documentoLimpio}`;
    
    // Verificar que el usuario existe en la BD antes de usarlo
    let idUsuarioFinal = null;
    if (req.usuario && req.usuario.id) {
      const [usuarios] = await db.query(
        'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
        [req.usuario.id]
      );
      if (usuarios.length > 0) {
        idUsuarioFinal = req.usuario.id;
      } else {
        console.log('⚠️ Usuario del token no existe en BD, usando NULL para id_usuario');
      }
    }
    
    console.log('💾 Insertando aprendiz en BD...');
    await db.query(
      `INSERT INTO personas (
        tipo_documento, documento, nombres, apellidos, codigo_qr, 
        programa, ficha, estado, id_usuario, id_rol_persona
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tipoDocumento, documentoLimpio, nombresLimpio, apellidosLimpio, codigoQR, 
       programaLimpio, fichaLimpia, estadoLimpio, idUsuarioFinal, idRolAprendiz]
    );
    
    console.log('✅ Aprendiz insertado exitosamente');
    
    const [nuevoAprendiz] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.tipo_documento as tipoDocumento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr as codigoQR,
        p.programa,
        p.ficha,
        p.estado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.documento = ?
    `, [documentoLimpio]);
    
    const a = nuevoAprendiz[0];
    console.log('✅ Aprendiz creado:', a.nombres);
    res.status(201).json({ 
      success: true, 
      data: {
        id: a.id,
        nombre: a.nombres,
        apellido: a.apellidos,
        nombres: a.nombres,
        apellidos: a.apellidos,
        documento: a.documento,
        tipoDocumento: a.tipoDocumento,
        codigoQR: a.codigoQR,
        programa: a.programa,
        ficha: a.ficha,
        estado: a.estado,
        rol: a.rol
      }
    });
  } catch (error) {
    console.error('❌ Error al crear aprendiz:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: true, message: 'Error al crear aprendiz: ' + error.message });
  }
});

// Actualizar aprendiz
router.put('/:id', async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      documento,
      tipoDocumento,
      programa,
      ficha,
      estado
    } = req.body;
    
    // Verificar si el aprendiz existe
    const [aprendizExiste] = await db.query(`
      SELECT p.id_persona 
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ? 
        AND (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
    `, [req.params.id]);
    
    if (aprendizExiste.length === 0) {
      return res.status(404).json({ error: true, message: 'Aprendiz no encontrado' });
    }
    
    // Si se está actualizando el documento, verificar que no exista en otro aprendiz
    if (documento) {
      const [docExiste] = await db.query(
        'SELECT id_persona FROM personas WHERE documento = ? AND id_persona != ?',
        [documento, req.params.id]
      );
      if (docExiste.length > 0) {
        return res.status(400).json({ error: true, message: 'El documento ya está registrado en otra persona' });
      }
    }
    
    await db.query(
      `UPDATE personas SET 
        nombres = COALESCE(?, nombres),
        apellidos = COALESCE(?, apellidos),
        documento = COALESCE(?, documento),
        tipo_documento = COALESCE(?, tipo_documento),
        programa = COALESCE(?, programa),
        ficha = COALESCE(?, ficha),
        estado = COALESCE(?, estado)
      WHERE id_persona = ?`,
      [nombre, apellido, documento, tipoDocumento, programa, ficha, estado, req.params.id]
    );
    
    const [aprendizActualizado] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.tipo_documento as tipoDocumento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr as codigoQR,
        p.programa,
        p.ficha,
        p.estado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ?
    `, [req.params.id]);
    
    const a = aprendizActualizado[0];
    res.json({ 
      success: true, 
      data: {
        id: a.id,
        nombre: a.nombres,
        apellido: a.apellidos,
        nombres: a.nombres,
        apellidos: a.apellidos,
        documento: a.documento,
        tipoDocumento: a.tipoDocumento,
        codigoQR: a.codigoQR,
        programa: a.programa,
        ficha: a.ficha,
        estado: a.estado,
        rol: a.rol
      }
    });
  } catch (error) {
    console.error('Error al actualizar aprendiz:', error);
    res.status(500).json({ error: true, message: 'Error al actualizar aprendiz' });
  }
});

// Eliminar aprendiz
router.delete('/:id', async (req, res) => {
  try {
    // Solo administradores pueden eliminar
    if (req.usuario.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para eliminar aprendices' });
    }
    
    const [resultado] = await db.query('DELETE FROM personas WHERE id_persona = ?', [req.params.id]);
    
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: true, message: 'Aprendiz no encontrado' });
    }
    
    res.json({ success: true, message: 'Aprendiz eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar aprendiz:', error);
    res.status(500).json({ error: true, message: 'Error al eliminar aprendiz' });
  }
});

// Carga masiva de aprendices
router.post('/bulk', async (req, res) => {
  try {
    console.log('📦 Iniciando carga masiva de aprendices...');
    const { aprendices } = req.body;
    
    if (!Array.isArray(aprendices) || aprendices.length === 0) {
      return res.status(400).json({ 
        error: true, 
        message: 'Se requiere un array de aprendices' 
      });
    }
    
    console.log(`📊 Total de aprendices a procesar: ${aprendices.length}`);
    
    // Obtener el ID del rol de aprendiz
    let [roles] = await db.query(`
      SELECT id_rol_persona 
      FROM roles_personas 
      WHERE LOWER(nombre_rol_persona) LIKE '%aprendiz%' 
         OR LOWER(nombre_rol_persona) LIKE '%estudiante%'
      LIMIT 1
    `);
    
    if (roles.length === 0) {
      console.log('⚠️ Rol APRENDIZ no existe. Creándolo automáticamente...');
      await db.query(
        'INSERT INTO roles_personas (nombre_rol_persona) VALUES (?)',
        ['APRENDIZ']
      );
      [roles] = await db.query(`
        SELECT id_rol_persona 
        FROM roles_personas 
        WHERE LOWER(nombre_rol_persona) LIKE '%aprendiz%' 
           OR LOWER(nombre_rol_persona) LIKE '%estudiante%'
        LIMIT 1
      `);
    }
    
    const idRolAprendiz = roles[0].id_rol_persona;
    
    // Verificar que el usuario existe
    let idUsuarioFinal = null;
    if (req.usuario && req.usuario.id) {
      const [usuarios] = await db.query(
        'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
        [req.usuario.id]
      );
      if (usuarios.length > 0) {
        idUsuarioFinal = req.usuario.id;
      }
    }
    
    const resultados = {
      exitosos: 0,
      fallidos: 0,
      duplicados: 0,
      errores: []
    };
    
    // Procesar cada aprendiz
    for (const aprendiz of aprendices) {
      try {
        const {
          nombre,
          apellido = '',
          documento,
          tipoDocumento = 'CC',
          programa = null,
          ficha = null,
          estado = 'ACTIVO'
        } = aprendiz;
        
        // Validaciones básicas
        if (!nombre || !documento) {
          resultados.fallidos++;
          resultados.errores.push({
            documento: documento || 'N/A',
            error: 'Faltan campos requeridos (nombre o documento)'
          });
          continue;
        }
        
        // Limpiar y validar documento
        let documentoLimpio = String(documento).trim();
        const soloNumeros = documentoLimpio.replace(/\D/g, '');
        if (soloNumeros.length > 0) {
          documentoLimpio = soloNumeros;
        }
        
        if (documentoLimpio.length > 50) {
          documentoLimpio = documentoLimpio.substring(0, 50);
        }
        
        if (!documentoLimpio || documentoLimpio.length < 5) {
          resultados.fallidos++;
          resultados.errores.push({
            documento: documento,
            error: 'Documento inválido (menos de 5 dígitos)'
          });
          continue;
        }
        
        // Verificar si ya existe
        const [existente] = await db.query(
          'SELECT id_persona FROM personas WHERE documento = ?',
          [documentoLimpio]
        );
        
        if (existente.length > 0) {
          resultados.duplicados++;
          continue;
        }
        
        // Limpiar datos
        const nombresLimpio = String(nombre).trim().substring(0, 100);
        const apellidosLimpio = apellido ? String(apellido).trim().substring(0, 100) : null;
        const programaLimpio = programa ? String(programa).trim().substring(0, 200) : null;
        const fichaLimpia = ficha ? String(ficha).trim().substring(0, 50) : null;
        
        // Validar estado
        let estadoLimpio = String(estado).toUpperCase().trim();
        if (!['ACTIVO', 'INACTIVO'].includes(estadoLimpio)) {
          estadoLimpio = 'ACTIVO';
        }
        
        // Validar tipo de documento
        let tipoDocLimpio = String(tipoDocumento).toUpperCase().trim();
        if (!['CC', 'TI', 'CE', 'PASAPORTE'].includes(tipoDocLimpio)) {
          tipoDocLimpio = 'CC';
        }
        
        // Generar código QR
        const codigoQR = `APR-${Date.now()}-${documentoLimpio}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Insertar en BD
        await db.query(
          `INSERT INTO personas (
            tipo_documento, documento, nombres, apellidos, codigo_qr, 
            programa, ficha, estado, id_usuario, id_rol_persona
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tipoDocLimpio, documentoLimpio, nombresLimpio, apellidosLimpio, codigoQR, 
           programaLimpio, fichaLimpia, estadoLimpio, idUsuarioFinal, idRolAprendiz]
        );
        
        resultados.exitosos++;
      } catch (error) {
        resultados.fallidos++;
        resultados.errores.push({
          documento: aprendiz.documento || 'N/A',
          error: error.message || 'Error desconocido'
        });
        console.error(`❌ Error al procesar aprendiz ${aprendiz.documento}:`, error);
      }
    }
    
    console.log(`✅ Carga masiva completada: ${resultados.exitosos} exitosos, ${resultados.duplicados} duplicados, ${resultados.fallidos} fallidos`);
    
    res.json({
      success: true,
      data: {
        total: aprendices.length,
        exitosos: resultados.exitosos,
        duplicados: resultados.duplicados,
        fallidos: resultados.fallidos,
        errores: resultados.errores
      }
    });
  } catch (error) {
    console.error('❌ Error en carga masiva:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Error al procesar carga masiva: ' + error.message 
    });
  }
});

module.exports = router;
