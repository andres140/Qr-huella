const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken } = require('./auth');
const { v4: uuidv4 } = require('uuid');

// Middleware de autenticación
router.use(verificarToken);

// =====================================================
// RUTAS DE VISITANTES
// =====================================================

// Obtener todos los visitantes (desde la tabla personas con rol VISITANTE)
router.get('/', async (req, res) => {
  try {
    const { estado } = req.query;
    let query = `
      SELECT 
        p.id_persona as id,
        p.nombres as nombre,
        p.apellidos as apellido,
        p.documento,
        p.tipo_documento,
        p.codigo_qr as codigoQR,
        p.zona,
        p.fecha_expiracion,
        p.estado,
        p.fecha_generacion as fecha_creacion
      FROM personas p
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE rp.nombre_rol_persona = 'VISITANTE'
    `;
    const params = [];
    
    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY p.fecha_generacion DESC';
    
    const [visitantes] = await db.query(query, params);
    res.json({ success: true, data: visitantes });
  } catch (error) {
    console.error('Error al obtener visitantes:', error);
    res.status(500).json({ error: true, message: 'Error al obtener visitantes' });
  }
});

// Obtener visitante por documento (desde la tabla personas con rol VISITANTE)
router.get('/documento/:documento', async (req, res) => {
  try {
    const [visitantes] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.nombres as nombre,
        p.apellidos as apellido,
        p.documento,
        p.tipo_documento,
        p.codigo_qr as codigoQR,
        p.zona,
        p.fecha_expiracion,
        p.estado
      FROM personas p
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.documento = ? AND rp.nombre_rol_persona = 'VISITANTE'
    `, [req.params.documento]);
    
    if (visitantes.length === 0) {
      return res.status(404).json({ 
        error: true, 
        message: 'Visitante no encontrado' 
      });
    }
    
    res.json({ success: true, data: visitantes[0] });
  } catch (error) {
    console.error('Error al obtener visitante:', error);
    res.status(500).json({ error: true, message: 'Error al obtener visitante' });
  }
});

// Obtener visitante por ID (desde la tabla personas con rol VISITANTE)
router.get('/:id', async (req, res) => {
  try {
    const [visitantes] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.nombres as nombre,
        p.apellidos as apellido,
        p.documento,
        p.tipo_documento,
        p.codigo_qr as codigoQR,
        p.zona,
        p.fecha_expiracion,
        p.estado
      FROM personas p
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ? AND rp.nombre_rol_persona = 'VISITANTE'
    `, [req.params.id]);
    
    if (visitantes.length === 0) {
      return res.status(404).json({ 
        error: true, 
        message: 'Visitante no encontrado' 
      });
    }
    
    res.json({ success: true, data: visitantes[0] });
  } catch (error) {
    console.error('Error al obtener visitante:', error);
    res.status(500).json({ error: true, message: 'Error al obtener visitante' });
  }
});

// Registrar nuevo visitante (se guarda en tabla personas con rol VISITANTE)
router.post('/', async (req, res) => {
  try {
    const { 
      nombre, 
      apellido, 
      documento, 
      tipoDocumento = 'CC',
      tipoSangre,
      motivo,
      zona, // Zona o destino donde se dirige el visitante
      horasValidez = 24, // Tiempo de validez del QR en horas
      minutosValidez = 0 // Tiempo de validez del QR en minutos adicionales
    } = req.body;
    
    if (!nombre || !documento) {
      return res.status(400).json({ 
        error: true, 
        message: 'Nombre y documento son requeridos' 
      });
    }
    
    // Obtener el id_rol_persona para VISITANTE
    let [roles] = await db.query(
      'SELECT id_rol_persona FROM roles_personas WHERE nombre_rol_persona = ?',
      ['VISITANTE']
    );
    
    // Si no existe el rol VISITANTE, crearlo automáticamente
    if (roles.length === 0) {
      console.log('⚠️ Rol VISITANTE no existe. Creándolo automáticamente...');
      await db.query(
        'INSERT INTO roles_personas (nombre_rol_persona) VALUES (?)',
        ['VISITANTE']
      );
      [roles] = await db.query(
        'SELECT id_rol_persona FROM roles_personas WHERE nombre_rol_persona = ?',
        ['VISITANTE']
      );
      console.log('✅ Rol VISITANTE creado automáticamente');
    }
    
    if (roles.length === 0) {
      return res.status(500).json({ 
        error: true, 
        message: 'Error al crear o obtener el rol VISITANTE' 
      });
    }
    
    const idRolVisitante = roles[0].id_rol_persona;
    
    // Verificar si el visitante ya existe en la tabla personas
    const [existente] = await db.query(
      `SELECT p.*, rp.nombre_rol_persona 
       FROM personas p
       LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
       WHERE p.documento = ? AND rp.nombre_rol_persona = 'VISITANTE'`,
      [documento]
    );
    
    if (existente.length > 0) {
      // Actualizar visitante existente y generar nuevo QR
      const personaId = existente[0].id_persona;
      
      // Generar nuevo código QR con tiempo de validez (horas y minutos)
      const codigoQR = `VISITOR_${documento}_${Date.now()}`;
      const fechaExpiracion = new Date();
      const horas = parseInt(horasValidez) || 0;
      const minutos = parseInt(minutosValidez) || 0;
      fechaExpiracion.setHours(fechaExpiracion.getHours() + horas);
      fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + minutos);
      
      await db.query(
        `UPDATE personas 
         SET nombres = ?, apellidos = ?, tipo_documento = ?, codigo_qr = ?, fecha_expiracion = ?, zona = ?, estado = 'ACTIVO'
         WHERE id_persona = ?`,
        [nombre, apellido || null, tipoDocumento, codigoQR, fechaExpiracion, zona || null, personaId]
      );
      
      const [visitante] = await db.query(`
        SELECT 
          p.id_persona as id,
          p.nombres as nombre,
          p.apellidos as apellido,
          p.documento,
          p.tipo_documento,
          p.codigo_qr as codigoQR,
          p.zona,
          p.fecha_expiracion,
          p.estado
        FROM personas p
        WHERE p.id_persona = ?
      `, [personaId]);
      
      return res.json({ 
        success: true, 
        data: visitante[0],
        mensaje: 'Visitante actualizado y QR regenerado' 
      });
    }
    
    // Crear nuevo visitante en la tabla personas
    // Generar código QR con tiempo de validez (horas y minutos)
    const codigoQR = `VISITOR_${documento}_${Date.now()}`;
    const fechaExpiracion = new Date();
    const horas = parseInt(horasValidez) || 0;
    const minutos = parseInt(minutosValidez) || 0;
    fechaExpiracion.setHours(fechaExpiracion.getHours() + horas);
    fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + minutos);
    
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
    
    await db.query(
      `INSERT INTO personas (
        tipo_documento, documento, nombres, apellidos, codigo_qr, 
        zona, estado, fecha_expiracion, id_rol_persona, id_usuario
      ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO', ?, ?, ?)`,
      [
        tipoDocumento, documento, nombre, apellido || null, codigoQR,
        zona || null, fechaExpiracion, idRolVisitante, idUsuarioFinal
      ]
    );
    
    const [nuevoVisitante] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.nombres as nombre,
        p.apellidos as apellido,
        p.documento,
        p.tipo_documento,
        p.codigo_qr as codigoQR,
        p.zona,
        p.fecha_expiracion,
        p.estado
      FROM personas p
      WHERE p.documento = ? AND p.id_rol_persona = ?
    `, [documento, idRolVisitante]);
    
    const visitanteCreado = nuevoVisitante[0];
    
    // Registrar automáticamente una ENTRADA en la BD con TIMESTAMP completo
    const fechaHoraAhora = new Date(); // TIMESTAMP completo con hora exacta
    await db.query(
      `INSERT INTO registros_entrada_salida (id_persona, tipo, fecha_entrada)
       VALUES (?, 'ENTRADA', ?)`,
      [visitanteCreado.id, fechaHoraAhora]
    );
    
    console.log(`✅ Visitante registrado en tabla personas: ${nombre} (${documento})`);
    console.log(`   QR: ${codigoQR}`);
    console.log(`   Expira: ${fechaExpiracion.toLocaleString('es-CO')}`);
    console.log(`   ✅ ENTRADA automática registrada en BD`);
    
    // Construir mensaje con horas y minutos
    const tiempoValidezTexto = horas > 0 && minutos > 0 
      ? `${horas} hora${horas > 1 ? 's' : ''} y ${minutos} minuto${minutos > 1 ? 's' : ''}`
      : horas > 0 
      ? `${horas} hora${horas > 1 ? 's' : ''}`
      : `${minutos} minuto${minutos > 1 ? 's' : ''}`;
    
    res.status(201).json({ 
      success: true, 
      data: visitanteCreado,
      mensaje: `Visitante registrado exitosamente. QR válido por ${tiempoValidezTexto}. ENTRADA automática registrada.` 
    });
  } catch (error) {
    console.error('Error al registrar visitante:', error);
    res.status(500).json({ error: true, message: 'Error al registrar visitante: ' + error.message });
  }
});

// Actualizar visitante (actualiza en tabla personas con rol VISITANTE)
router.put('/:id', async (req, res) => {
  try {
    const { nombre, apellido, tipo_documento, estado } = req.body;
    
    await db.query(
      `UPDATE personas 
       SET nombres = ?, apellidos = ?, tipo_documento = ?, estado = ?
       WHERE id_persona = ?`,
      [nombre, apellido || null, tipo_documento, estado || 'ACTIVO', req.params.id]
    );
    
    const [visitante] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.nombres as nombre,
        p.apellidos as apellido,
        p.documento,
        p.tipo_documento,
        p.codigo_qr as codigoQR,
        p.fecha_expiracion,
        p.estado
      FROM personas p
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ? AND rp.nombre_rol_persona = 'VISITANTE'
    `, [req.params.id]);
    
    if (visitante.length === 0) {
      return res.status(404).json({ error: true, message: 'Visitante no encontrado' });
    }
    
    res.json({ success: true, data: visitante[0] });
  } catch (error) {
    console.error('Error al actualizar visitante:', error);
    res.status(500).json({ error: true, message: 'Error al actualizar visitante' });
  }
});

// Eliminar visitante (soft delete - actualiza en tabla personas)
router.delete('/:id', async (req, res) => {
  try {
    const [resultado] = await db.query(
      `UPDATE personas p
       INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
       SET p.estado = 'INACTIVO'
       WHERE p.id_persona = ? AND rp.nombre_rol_persona = 'VISITANTE'`,
      [req.params.id]
    );
    
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: true, message: 'Visitante no encontrado' });
    }
    
    res.json({ success: true, message: 'Visitante desactivado correctamente' });
  } catch (error) {
    console.error('Error al eliminar visitante:', error);
    res.status(500).json({ error: true, message: 'Error al eliminar visitante' });
  }
});

// =====================================================
// RUTAS DE QR TEMPORALES
// =====================================================

// Generar QR temporal para visitante (actualiza el QR en la tabla personas)
router.post('/:id/generar-qr', async (req, res) => {
  try {
    const visitanteId = req.params.id;
    const { horasValidez = 24, minutosValidez = 0 } = req.body;
    
    // Verificar que el visitante existe en la tabla personas con rol VISITANTE
    const [visitantes] = await db.query(`
      SELECT p.*, rp.nombre_rol_persona 
      FROM personas p
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ? AND rp.nombre_rol_persona = 'VISITANTE' AND p.estado = 'ACTIVO'
    `, [visitanteId]);
    
    if (visitantes.length === 0) {
      return res.status(404).json({ 
        error: true, 
        message: 'Visitante no encontrado o inactivo' 
      });
    }
    
    const visitante = visitantes[0];
    
    // Generar código QR único
    const codigoQR = `VISITOR_${visitante.documento}_${Date.now()}`;
    
    // Calcular fecha de expiración (horas y minutos)
    const fechaExpiracion = new Date();
    const horas = parseInt(horasValidez) || 0;
    const minutos = parseInt(minutosValidez) || 0;
    fechaExpiracion.setHours(fechaExpiracion.getHours() + horas);
    fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + minutos);
    
    // Actualizar el QR en la tabla personas
    await db.query(
      `UPDATE personas 
       SET codigo_qr = ?, fecha_expiracion = ?
       WHERE id_persona = ?`,
      [codigoQR, fechaExpiracion, visitanteId]
    );
    
    // Obtener el visitante actualizado
    const [visitanteActualizado] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.nombres as nombre,
        p.apellidos as apellido,
        p.documento,
        p.tipo_documento,
        p.codigo_qr as codigoQR,
        p.fecha_expiracion as fechaExpiracion,
        p.estado
      FROM personas p
      WHERE p.id_persona = ?
    `, [visitanteId]);
    
    console.log(`✅ QR generado para visitante ${visitante.nombres} (${visitante.documento})`);
    console.log(`   Código: ${codigoQR}`);
    console.log(`   Expira: ${fechaExpiracion.toLocaleString('es-CO')}`);
    
    // Construir mensaje con horas y minutos
    const tiempoValidezTexto = horas > 0 && minutos > 0 
      ? `${horas} hora${horas > 1 ? 's' : ''} y ${minutos} minuto${minutos > 1 ? 's' : ''}`
      : horas > 0 
      ? `${horas} hora${horas > 1 ? 's' : ''}`
      : `${minutos} minuto${minutos > 1 ? 's' : ''}`;
    
    res.status(201).json({ 
      success: true, 
      data: visitanteActualizado[0],
      mensaje: `QR generado válido por ${tiempoValidezTexto}` 
    });
  } catch (error) {
    console.error('Error al generar QR:', error);
    res.status(500).json({ error: true, message: 'Error al generar código QR' });
  }
});

// Obtener QR de un visitante (el QR está en la tabla personas)
router.get('/:id/qrs', async (req, res) => {
  try {
    const [personas] = await db.query(`
      SELECT 
        p.id_persona as id,
        p.codigo_qr as codigoQR,
        p.fecha_generacion as fechaGeneracion,
        p.fecha_expiracion as fechaExpiracion,
        p.estado
      FROM personas p
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ? AND rp.nombre_rol_persona = 'VISITANTE'
    `, [req.params.id]);
    
    if (personas.length === 0) {
      return res.status(404).json({ 
        error: true, 
        message: 'Visitante no encontrado' 
      });
    }
    
    // Retornar el QR como un array con un solo elemento para compatibilidad
    res.json({ success: true, data: [personas[0]] });
  } catch (error) {
    console.error('Error al obtener QR:', error);
    res.status(500).json({ error: true, message: 'Error al obtener código QR' });
  }
});

// Validar QR de visitante (busca en la tabla personas)
router.post('/validar-qr', async (req, res) => {
  try {
    const { codigoQR } = req.body;
    
    if (!codigoQR) {
      return res.status(400).json({ 
        error: true, 
        message: 'Código QR es requerido' 
      });
    }
    
    console.log(`🔍 Validando QR de visitante: ${codigoQR}`);
    
    // Buscar el QR en la tabla personas con rol VISITANTE
    const [personas] = await db.query(`
      SELECT 
        p.id_persona,
        p.nombres,
        p.apellidos,
        p.documento,
        p.tipo_documento,
        p.codigo_qr,
        p.fecha_expiracion,
        p.estado,
        rp.nombre_rol_persona
      FROM personas p
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.codigo_qr = ? AND rp.nombre_rol_persona = 'VISITANTE'
    `, [codigoQR]);
    
    if (personas.length === 0) {
      console.log('❌ QR no encontrado');
      return res.json({ 
        success: true, 
        valido: false, 
        mensaje: 'Código QR no encontrado' 
      });
    }
    
    const persona = personas[0];
    const ahora = new Date();
    const fechaExpiracion = new Date(persona.fecha_expiracion);
    
    // Verificar si está expirado
    if (fechaExpiracion < ahora) {
      console.log(`⏰ QR expirado (expiró: ${fechaExpiracion.toLocaleString('es-CO')})`);
      
      // Verificar si hay una entrada sin salida registrada
      const [entradasSinSalida] = await db.query(
        `SELECT fecha_entrada
         FROM registros_entrada_salida
         WHERE id_persona = ? AND tipo = 'ENTRADA' AND fecha_salida IS NULL
         ORDER BY fecha_entrada DESC
         LIMIT 1`,
        [persona.id_persona]
      );
      
      let salidaRegistrada = false;
      let fechaEntradaAnterior = null;
      
      // Si hay una entrada sin salida, registrar automáticamente la salida
      if (entradasSinSalida.length > 0) {
        fechaEntradaAnterior = entradasSinSalida[0].fecha_entrada;
        console.log(`📝 Detectada entrada sin salida. Registrando salida automáticamente...`);
        console.log(`   Fecha entrada: ${fechaEntradaAnterior}`);
        console.log(`   Fecha salida (ahora): ${ahora.toLocaleString('es-CO')}`);
        
        // Registrar la salida automáticamente
        await db.query(
          `INSERT INTO registros_entrada_salida (id_persona, tipo, fecha_entrada, fecha_salida)
           VALUES (?, 'SALIDA', ?, ?)`,
          [persona.id_persona, fechaEntradaAnterior, ahora]
        );
        
        salidaRegistrada = true;
        console.log(`✅ Salida registrada automáticamente para visitante expirado`);
      }
      
      // Actualizar la BD con la fecha/hora en que se detectó la expiración
      await db.query(
        `UPDATE personas 
         SET fecha_expiracion = ?
         WHERE id_persona = ?`,
        [ahora, persona.id_persona]
      );
      
      console.log(`📝 Fecha de expiración actualizada en BD: ${ahora.toLocaleString('es-CO')}`);
      
      return res.json({ 
        success: true, 
        valido: false, 
        mensaje: salidaRegistrada 
          ? 'Código QR expirado. Salida registrada automáticamente en la BD'
          : 'Código QR expirado',
        data: {
          fechaExpiracion: ahora, // Fecha en que se detectó la expiración
          fechaExpiracionOriginal: persona.fecha_expiracion, // Fecha programada original
          salidaRegistrada: salidaRegistrada, // Indica si se registró una salida automáticamente
          fechaSalida: salidaRegistrada ? ahora : null, // Fecha de la salida registrada
          fechaEntrada: fechaEntradaAnterior, // Fecha de la entrada asociada
          visitante: {
            nombre: persona.nombres,
            apellido: persona.apellidos,
            documento: persona.documento
          }
        }
      });
    }
    
    // Verificar estado de la persona
    if (persona.estado !== 'ACTIVO') {
      console.log(`❌ Visitante con estado: ${persona.estado}`);
      return res.json({ 
        success: true, 
        valido: false, 
        mensaje: `Visitante en estado: ${persona.estado}` 
      });
    }
    
    console.log(`✅ QR válido para ${persona.nombres} ${persona.apellidos || ''}`);
    
    res.json({ 
      success: true, 
      valido: true, 
      mensaje: 'Código QR válido',
      data: {
        visitanteId: persona.id_persona,
        qrId: persona.id_persona, // Usar id_persona como qrId para compatibilidad
        nombre: persona.nombres,
        apellido: persona.apellidos,
        documento: persona.documento,
        tipoDocumento: persona.tipo_documento,
        fechaExpiracion: persona.fecha_expiracion,
        horasRestantes: Math.round((fechaExpiracion - ahora) / (1000 * 60 * 60))
      }
    });
  } catch (error) {
    console.error('Error al validar QR:', error);
    res.status(500).json({ error: true, message: 'Error al validar código QR' });
  }
});

// Registrar entrada/salida de visitante (usa tabla registros_entrada_salida)
// Determina automáticamente si es ENTRADA o SALIDA basándose en el último registro
router.post('/registrar-acceso', async (req, res) => {
  try {
    const { visitanteId, qrId, tipo, ubicacion = 'Principal' } = req.body;
    
    if (!visitanteId) {
      return res.status(400).json({ 
        error: true, 
        message: 'visitanteId es requerido' 
      });
    }
    
    // Verificar que el visitante existe y tiene rol VISITANTE
    const [personas] = await db.query(`
      SELECT p.id_persona, rp.nombre_rol_persona
      FROM personas p
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ? AND rp.nombre_rol_persona = 'VISITANTE'
    `, [visitanteId]);
    
    if (personas.length === 0) {
      return res.status(404).json({ 
        error: true, 
        message: 'Visitante no encontrado' 
      });
    }
    
    // Obtener el último registro para determinar si es ENTRADA o SALIDA
    const [ultimoRegistro] = await db.query(`
      SELECT tipo, fecha_entrada, fecha_salida
      FROM registros_entrada_salida
      WHERE id_persona = ?
      ORDER BY
        COALESCE(fecha_entrada, fecha_salida) DESC,
        id_registro_entrada_salida DESC
      LIMIT 1
    `, [visitanteId]);
    
    let tipoFinal;
    
    if (ultimoRegistro.length === 0) {
      // No hay registros previos, debe ser ENTRADA
      tipoFinal = 'ENTRADA';
      console.log('🔄 No hay registros previos. Tipo determinado: ENTRADA');
    } else {
      const ultimoTipo = ultimoRegistro[0].tipo;
      
      if (ultimoTipo === 'ENTRADA') {
        tipoFinal = 'SALIDA';
        console.log('🔄 Último registro: ENTRADA. Tipo determinado: SALIDA');
      } else if (ultimoTipo === 'SALIDA') {
        tipoFinal = 'ENTRADA';
        console.log('🔄 Último registro: SALIDA. Tipo determinado: ENTRADA');
      } else {
        tipoFinal = 'ENTRADA';
        console.log('🔄 Tipo del último registro desconocido. Tipo determinado: ENTRADA (por defecto)');
      }
    }
    
    console.log('✅ Tipo final determinado automáticamente:', tipoFinal);
    
    // Usar TIMESTAMP completo con hora exacta
    const fechaHoraAhora = new Date();
    
    // Registrar en la tabla registros_entrada_salida
    if (tipoFinal === 'ENTRADA') {
      await db.query(
        `INSERT INTO registros_entrada_salida (id_persona, tipo, fecha_entrada)
         VALUES (?, ?, ?)`,
        [visitanteId, tipoFinal, fechaHoraAhora]
      );
      console.log('✅ Registro de ENTRADA creado con hora exacta');
    } else {
      // Para salida, buscar la entrada previa para incluir su fecha_entrada
      const [entradaPrevia] = await db.query(
        `SELECT fecha_entrada
         FROM registros_entrada_salida
         WHERE id_persona = ? AND tipo = 'ENTRADA' AND fecha_salida IS NULL
         ORDER BY fecha_entrada DESC
         LIMIT 1`,
        [visitanteId]
      );
      
      const fechaEntrada = entradaPrevia.length > 0 ? entradaPrevia[0].fecha_entrada : fechaHoraAhora;
      
      await db.query(
        `INSERT INTO registros_entrada_salida (id_persona, tipo, fecha_entrada, fecha_salida)
         VALUES (?, ?, ?, ?)`,
        [visitanteId, tipoFinal, fechaEntrada, fechaHoraAhora]
      );
      console.log('✅ Registro de SALIDA creado con hora exacta');
    }
    
    console.log(`📝 ${tipoFinal} registrada para visitante ID: ${visitanteId}`);
    
    res.status(201).json({ 
      success: true, 
      mensaje: `${tipoFinal} registrada exitosamente`,
      tipoRegistrado: tipoFinal
    });
  } catch (error) {
    console.error('Error al registrar acceso:', error);
    res.status(500).json({ error: true, message: 'Error al registrar acceso: ' + error.message });
  }
});

// Obtener historial de accesos de un visitante (desde registros_entrada_salida)
router.get('/:id/accesos', async (req, res) => {
  try {
    const [accesos] = await db.query(`
      SELECT 
        r.id_registro_entrada_salida as id,
        r.tipo,
        r.fecha_entrada,
        r.fecha_salida,
        COALESCE(r.fecha_entrada, r.fecha_salida) as timestamp
      FROM registros_entrada_salida r
      WHERE r.id_persona = ?
      ORDER BY COALESCE(r.fecha_entrada, r.fecha_salida) DESC
    `, [req.params.id]);
    
    res.json({ success: true, data: accesos });
  } catch (error) {
    console.error('Error al obtener accesos:', error);
    res.status(500).json({ error: true, message: 'Error al obtener accesos' });
  }
});

module.exports = router;



