const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken } = require('./auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Middleware de autenticación
router.use(verificarToken);

// Obtener todos los aprendices (personas con rol de aprendiz)
router.get('/', async (req, res) => {
  try {
    const { estado, buscar, ficha, programa } = req.query;
    
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
        p.foto,
        COALESCE(ep.nombre_estado, p.estado) as estado_detallado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
      WHERE LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%'
    `;
    const params = [];
    
    if (estado && estado !== 'TODOS') {
      query += ' AND p.estado = ?';
      params.push(estado);
    }
    
    // Si hay ficha o programa, aplicar esos filtros primero (más específicos)
    // y solo aplicar 'buscar' si no hay ficha ni programa
    if (ficha) {
      // Ficha suele ser un código exacto, filtrar por igualdad exacta
      // Normalizar: convertir a string, quitar espacios, y comparar
      const fichaTrim = String(ficha).trim();
      // Buscar tanto con comparación exacta como con LIKE para mayor flexibilidad
      // También considerar que puede estar guardada como número o string
      query += ' AND (TRIM(CAST(p.ficha AS CHAR)) = ? OR CAST(p.ficha AS CHAR) = ? OR p.ficha = ?)';
      params.push(fichaTrim, fichaTrim, fichaTrim);
      console.log(`🔍 Buscando por ficha: "${fichaTrim}"`);
    }
    
    if (programa) {
      // Para programa, permitir escribir por ejemplo "adso" y que coincida con nombres más largos
      const programaTrim = String(programa).trim().toUpperCase();
      query += ' AND UPPER(p.programa) LIKE ?';
      params.push(`%${programaTrim}%`);
    }
    
    // Solo aplicar 'buscar' si no hay ficha ni programa (para evitar conflictos)
    // O si hay ficha/programa, usar 'buscar' como filtro adicional en nombres/documentos
    if (buscar && !ficha && !programa) {
      const buscarTrim = buscar.trim();
      console.log(`🔍 Búsqueda simple (sin ficha/programa): "${buscarTrim}"`);

      // Si el término de búsqueda es solo números, buscar coincidencia exacta en documento
      // IMPORTANTE: Normalizar el documento eliminando caracteres no numéricos antes de comparar
      if (/^\d+$/.test(buscarTrim)) {
        // Normalizar el término de búsqueda (solo números)
        const docNormalizado = buscarTrim.replace(/\D/g, '');
        // Buscar coincidencia exacta en documento
        // También buscar con LIKE por si el documento tiene formato diferente
        query += ' AND (p.documento = ? OR p.documento LIKE ?)';
        params.push(docNormalizado, `%${docNormalizado}%`);
        console.log(`   📄 Buscando documento: "${docNormalizado}"`);
      } else {
        // Normalizar a MAYÚSCULAS para comparar sin problemas de may/min
        const buscarUpper = buscarTrim.toUpperCase();
        const buscarLike = `%${buscarUpper}%`;

        // BÚSQUEDA MEJORADA: Buscar en nombres, apellidos, nombre completo y documento
        // NO buscar en programa ni ficha cuando es texto (para evitar resultados irrelevantes)
        query += `
          AND (
            UPPER(TRIM(p.nombres)) LIKE ?
            OR UPPER(TRIM(p.apellidos)) LIKE ?
            OR UPPER(TRIM(CONCAT(p.nombres, ' ', p.apellidos))) LIKE ?
            OR UPPER(TRIM(p.documento)) LIKE ?
          )
        `;
        params.push(
          buscarLike,
          buscarLike,
          buscarLike,
          buscarLike
        );
        console.log(`   📝 Buscando texto: "${buscarTrim}" en nombres, apellidos y documento`);
      }
    } else if (buscar && (ficha || programa)) {
      // Si hay ficha o programa Y también hay buscar, usar buscar como filtro adicional
      // IMPORTANTE: Aplicar como AND, no como OR, para que todos los filtros se combinen
      const buscarTrim = buscar.trim();
      
      if (/^\d+$/.test(buscarTrim)) {
        // Si es numérico, buscar coincidencia exacta en documento
        query += ' AND p.documento = ?';
        params.push(buscarTrim);
      } else {
        // Si es texto, buscar en nombres, apellidos, nombre completo o documento
        // Usar OR dentro del filtro de buscar, pero AND con los otros filtros
        const buscarUpper = buscarTrim.toUpperCase();
        const buscarLike = `%${buscarUpper}%`;
        query += `
          AND (
            UPPER(p.nombres) LIKE ?
            OR UPPER(p.apellidos) LIKE ?
            OR UPPER(CONCAT(p.nombres, ' ', p.apellidos)) LIKE ?
            OR UPPER(p.documento) LIKE ?
          )
        `;
        params.push(buscarLike, buscarLike, buscarLike, buscarLike);
        console.log(`🔍 Buscando por término adicional: "${buscarTrim}" (combinado con otros filtros)`);
      }
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
      estado: a.estado_detallado || a.estado, // Usar estado detallado si existe
      foto: a.foto, // Incluir foto
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
        p.foto,
        COALESCE(ep.nombre_estado, p.estado) as estado_detallado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
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
        estado: a.estado_detallado || a.estado,
        foto: a.foto,
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
        p.foto,
        COALESCE(ep.nombre_estado, p.estado) as estado_detallado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
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
        estado: a.estado_detallado || a.estado,
        foto: a.foto,
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
    // Normalizar documento: eliminar caracteres que no sean dígitos
    let documentoLimpio = String(req.params.documento || '').trim();
    const soloNumeros = documentoLimpio.replace(/\D/g, '');
    if (soloNumeros.length > 0) {
      documentoLimpio = soloNumeros;
    }

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
        p.foto,
        COALESCE(ep.nombre_estado, p.estado) as estado_detallado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
      WHERE p.documento = ? 
        AND (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
    `, [documentoLimpio]);
    
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
        estado: a.estado_detallado || a.estado,
        foto: a.foto,
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
    
    // Validar y obtener estado de persona (estados_personas)
    let idEstadoPersona = null;
    let estadoLimpio = 'ACTIVO'; // Estado básico por defecto
    
    if (estado) {
      const estadoNormalizado = String(estado).toUpperCase().trim();
      
      // Buscar el estado en estados_personas
      const [estadosEncontrados] = await db.query(
        'SELECT id_estado_persona FROM estados_personas WHERE UPPER(nombre_estado) = ?',
        [estadoNormalizado]
      );
      
      if (estadosEncontrados.length > 0) {
        idEstadoPersona = estadosEncontrados[0].id_estado_persona;
        // Si el estado es ACTIVO o INACTIVO, también actualizar el campo estado
        if (['ACTIVO', 'INACTIVO'].includes(estadoNormalizado)) {
          estadoLimpio = estadoNormalizado;
        }
      } else {
        // Si no existe el estado, intentar crear uno nuevo o usar ACTIVO
        console.log(`⚠️ Estado "${estadoNormalizado}" no encontrado en estados_personas, usando ACTIVO por defecto`);
        if (['ACTIVO', 'INACTIVO'].includes(estadoNormalizado)) {
          estadoLimpio = estadoNormalizado;
        }
      }
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
        programa, ficha, estado, id_usuario, id_rol_persona, id_estado_persona
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tipoDocumento, documentoLimpio, nombresLimpio, apellidosLimpio, codigoQR, 
       programaLimpio, fichaLimpia, estadoLimpio, idUsuarioFinal, idRolAprendiz, idEstadoPersona]
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
        p.foto,
        COALESCE(ep.nombre_estado, p.estado) as estado_detallado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
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
        estado: a.estado_detallado || a.estado,
        foto: a.foto,
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
    
    // Manejar estado si se proporciona
    let idEstadoPersonaUpdate = null;
    let estadoLimpioUpdate = null;
    
    if (estado) {
      const estadoNormalizado = String(estado).toUpperCase().trim();
      
      // Buscar el estado en estados_personas
      const [estadosEncontrados] = await db.query(
        'SELECT id_estado_persona FROM estados_personas WHERE UPPER(nombre_estado) = ?',
        [estadoNormalizado]
      );
      
      if (estadosEncontrados.length > 0) {
        idEstadoPersonaUpdate = estadosEncontrados[0].id_estado_persona;
        // Si el estado es ACTIVO o INACTIVO, también actualizar el campo estado
        if (['ACTIVO', 'INACTIVO'].includes(estadoNormalizado)) {
          estadoLimpioUpdate = estadoNormalizado;
        }
      } else {
        // Si no existe el estado, solo actualizar si es ACTIVO o INACTIVO
        if (['ACTIVO', 'INACTIVO'].includes(estadoNormalizado)) {
          estadoLimpioUpdate = estadoNormalizado;
        }
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
        estado = COALESCE(?, estado),
        id_estado_persona = COALESCE(?, id_estado_persona)
      WHERE id_persona = ?`,
      [nombre, apellido, documento, tipoDocumento, programa, ficha, estadoLimpioUpdate, idEstadoPersonaUpdate, req.params.id]
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
        p.foto,
        COALESCE(ep.nombre_estado, p.estado) as estado_detallado,
        rp.nombre_rol_persona as rol
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
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
        estado: a.estado_detallado || a.estado,
        foto: a.foto,
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
        
        // Validar y limpiar programa
        let programaLimpio = null;
        if (programa) {
          const programaStr = String(programa).trim();
          if (programaStr && programaStr !== 'null' && programaStr !== 'undefined' && programaStr !== '') {
            programaLimpio = programaStr.substring(0, 200);
          }
        }
        
        // Validar y limpiar ficha - IMPORTANTE: asegurar que se guarde correctamente
        let fichaLimpia = null;
        if (ficha) {
          const fichaStr = String(ficha).trim();
          // Solo usar ficha si no es 'N/A', 'null', 'undefined' o vacío
          if (fichaStr && fichaStr !== 'N/A' && fichaStr !== 'null' && fichaStr !== 'undefined' && fichaStr !== '') {
            fichaLimpia = fichaStr.substring(0, 50);
          }
        }
        
        // Log detallado antes de guardar
        console.log(`💾 Guardando aprendiz: Doc=${documentoLimpio}, Ficha=${fichaLimpia || 'null'}, Programa=${programaLimpio || 'null'}`);
        console.log(`   - Ficha original recibida: "${ficha}"`);
        console.log(`   - Ficha después de limpieza: "${fichaLimpia || 'null'}"`);
        
        // Validar y obtener estado de persona (estados_personas)
        let idEstadoPersona = null;
        let estadoLimpio = 'ACTIVO'; // Estado básico por defecto
        
        if (estado) {
          const estadoNormalizado = String(estado).toUpperCase().trim();
          
          // Buscar el estado en estados_personas
          const [estadosEncontrados] = await db.query(
            'SELECT id_estado_persona FROM estados_personas WHERE UPPER(nombre_estado) = ?',
            [estadoNormalizado]
          );
          
          if (estadosEncontrados.length > 0) {
            idEstadoPersona = estadosEncontrados[0].id_estado_persona;
            // Si el estado es ACTIVO o INACTIVO, también actualizar el campo estado
            if (['ACTIVO', 'INACTIVO'].includes(estadoNormalizado)) {
              estadoLimpio = estadoNormalizado;
            }
          } else {
            // Si no existe el estado, intentar crear uno nuevo o usar ACTIVO
            console.log(`⚠️ Estado "${estadoNormalizado}" no encontrado en estados_personas, usando ACTIVO por defecto`);
            if (['ACTIVO', 'INACTIVO'].includes(estadoNormalizado)) {
              estadoLimpio = estadoNormalizado;
            }
          }
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
            programa, ficha, estado, id_usuario, id_rol_persona, id_estado_persona
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tipoDocLimpio, documentoLimpio, nombresLimpio, apellidosLimpio, codigoQR, 
           programaLimpio, fichaLimpia, estadoLimpio, idUsuarioFinal, idRolAprendiz, idEstadoPersona]
        );
        
        // Verificar que se guardó correctamente (solo para los primeros 3 para no saturar logs)
        if (resultados.exitosos < 3) {
          const [verificacion] = await db.query(
            'SELECT ficha FROM personas WHERE documento = ?',
            [documentoLimpio]
          );
          if (verificacion.length > 0) {
            console.log(`   ✅ Verificado en BD: Ficha guardada = "${verificacion[0].ficha || 'null'}"`);
          }
        }
        
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

// Subir foto de aprendiz
router.post('/:id/foto', async (req, res) => {
  try {
    // Primero verificar que el aprendiz existe y obtener su documento
    const [aprendizExiste] = await db.query(`
      SELECT p.id_persona, p.documento, p.foto
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ? 
        AND (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
    `, [req.params.id]);

    if (aprendizExiste.length === 0) {
      return res.status(404).json({ error: true, message: 'Aprendiz no encontrado' });
    }

    const aprendiz = aprendizExiste[0];
    
    // Configurar multer con el documento del aprendiz
    const multer = require('multer');
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, '../uploads/fotos');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
      },
      filename: function (req, file, cb) {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${aprendiz.documento}-${timestamp}${ext}`;
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos de imagen (JPEG, JPG, PNG, GIF, WEBP)'));
      }
    };

    const uploadSingle = multer({
      storage: storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
      },
      fileFilter: fileFilter
    }).single('foto');

    // Ejecutar upload
    uploadSingle(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ 
          error: true, 
          message: err.message || 'Error al subir archivo' 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          error: true, 
          message: 'No se proporcionó ningún archivo' 
        });
      }
    
      // Eliminar foto anterior si existe
      if (aprendiz.foto) {
        const fotoAnteriorPath = path.join(__dirname, '../uploads/fotos', path.basename(aprendiz.foto));
        if (fs.existsSync(fotoAnteriorPath)) {
          try {
            fs.unlinkSync(fotoAnteriorPath);
            console.log('✅ Foto anterior eliminada:', fotoAnteriorPath);
          } catch (error) {
            console.warn('⚠️ No se pudo eliminar la foto anterior:', error.message);
          }
        }
      }

      // Guardar ruta de la foto en la base de datos
      // Formato: uploads/fotos/[documento]-[timestamp].ext
      const fotoRuta = `uploads/fotos/${req.file.filename}`;
      
      await db.query(
        'UPDATE personas SET foto = ? WHERE id_persona = ?',
        [fotoRuta, req.params.id]
      );

      console.log('✅ Foto actualizada para aprendiz:', aprendiz.documento);

      // Obtener aprendiz actualizado
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
          p.foto,
          COALESCE(ep.nombre_estado, p.estado) as estado_detallado,
          rp.nombre_rol_persona as rol
        FROM personas p
        INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
        LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
        WHERE p.id_persona = ?
      `, [req.params.id]);

      const a = aprendizActualizado[0];
      res.json({ 
        success: true, 
        message: 'Foto subida exitosamente',
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
          estado: a.estado_detallado || a.estado,
          foto: a.foto,
          rol: a.rol
        }
      });
    });
  } catch (error) {
    console.error('❌ Error al subir foto:', error);
    
    res.status(500).json({ 
      error: true, 
      message: 'Error al subir foto: ' + error.message 
    });
  }
});

// Eliminar foto de aprendiz
router.delete('/:id/foto', async (req, res) => {
  try {
    // Verificar que el aprendiz existe
    const [aprendizExiste] = await db.query(`
      SELECT p.id_persona, p.documento, p.foto
      FROM personas p
      INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ? 
        AND (LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%')
    `, [req.params.id]);

    if (aprendizExiste.length === 0) {
      return res.status(404).json({ error: true, message: 'Aprendiz no encontrado' });
    }

    const aprendiz = aprendizExiste[0];
    
    if (!aprendiz.foto) {
      return res.status(400).json({ error: true, message: 'El aprendiz no tiene foto asignada' });
    }

    // Eliminar archivo físico
    const fotoPath = path.join(__dirname, '../uploads/fotos', path.basename(aprendiz.foto));
    if (fs.existsSync(fotoPath)) {
      try {
        fs.unlinkSync(fotoPath);
        console.log('✅ Foto eliminada del sistema de archivos:', fotoPath);
      } catch (error) {
        console.warn('⚠️ No se pudo eliminar el archivo físico:', error.message);
      }
    }

    // Eliminar referencia en la base de datos
    await db.query(
      'UPDATE personas SET foto = NULL WHERE id_persona = ?',
      [req.params.id]
    );

    console.log('✅ Foto eliminada para aprendiz:', aprendiz.documento);

    res.json({ 
      success: true, 
      message: 'Foto eliminada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al eliminar foto:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Error al eliminar foto: ' + error.message 
    });
  }
});

module.exports = router;
