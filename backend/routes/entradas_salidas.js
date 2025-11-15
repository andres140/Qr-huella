const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken } = require('./auth');

// Middleware de autenticación
router.use(verificarToken);

// Obtener todos los registros de entrada/salida
router.get('/', async (req, res) => {
  try {
    const { fecha, tipo, personaId, limit = 100 } = req.query;
    let query = `
      SELECT 
        r.id_registro_entrada_salida as id,
        r.id_persona as personaId,
        r.tipo,
        r.fecha_entrada,
        r.fecha_salida,
        p.nombres,
        p.apellidos,
        p.documento,
        p.codigo_qr as codigoQR,
        p.programa,
        p.ficha
      FROM registros_entrada_salida r
      INNER JOIN personas p ON r.id_persona = p.id_persona
      WHERE 1=1
    `;
    const params = [];
    
    if (fecha) {
      query += ' AND (r.fecha_entrada = ? OR r.fecha_salida = ?)';
      params.push(fecha, fecha);
    }
    
    if (tipo) {
      query += ' AND r.tipo = ?';
      params.push(tipo);
    }
    
    if (personaId) {
      query += ' AND r.id_persona = ?';
      params.push(personaId);
    }
    
    query += ' ORDER BY COALESCE(r.fecha_entrada, r.fecha_salida) DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [registros] = await db.query(query, params);
    res.json({ success: true, data: registros });
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ error: true, message: 'Error al obtener registros' });
  }
});

// Obtener registros de hoy
router.get('/hoy', async (req, res) => {
  try {
    const [registros] = await db.query(`
      SELECT 
        r.id_registro_entrada_salida as id,
        r.id_persona as personaId,
        r.tipo,
        r.fecha_entrada,
        r.fecha_salida,
        p.nombres,
        p.apellidos,
        p.documento,
        p.codigo_qr as codigoQR,
        p.programa,
        p.ficha
      FROM registros_entrada_salida r
      INNER JOIN personas p ON r.id_persona = p.id_persona
      WHERE (DATE(r.fecha_entrada) = CURDATE() OR DATE(r.fecha_salida) = CURDATE())
      ORDER BY COALESCE(r.fecha_entrada, r.fecha_salida) DESC
    `);
    
    res.json({ success: true, data: registros });
  } catch (error) {
    console.error('Error al obtener registros de hoy:', error);
    res.status(500).json({ error: true, message: 'Error al obtener registros de hoy' });
  }
});

// Registrar entrada o salida escaneando QR
router.post('/escanear', async (req, res) => {
  try {
    console.log('📝 Intentando registrar entrada/salida...');
    console.log('Body recibido:', req.body);
    
    const { codigoQR, tipo } = req.body;
    
    if (!codigoQR) {
      console.log('❌ Validación fallida: codigoQR requerido');
      return res.status(400).json({ 
        error: true, 
        message: 'Campo requerido: codigoQR' 
      });
    }
    
    // El tipo es opcional - si no se proporciona o es 'AUTO', se determinará automáticamente
    // Si se proporciona, debe ser ENTRADA o SALIDA (aunque se ignorará y se determinará automáticamente)
    if (tipo && !['ENTRADA', 'SALIDA', 'AUTO'].includes(tipo)) {
      return res.status(400).json({ 
        error: true, 
        message: 'Tipo debe ser ENTRADA, SALIDA o AUTO (o omitirse para determinación automática)' 
      });
    }
    
    // Buscar persona por código QR
    console.log('🔍 Buscando persona con código QR:', codigoQR);
    const [personas] = await db.query(
      'SELECT * FROM personas WHERE codigo_qr = ?',
      [codigoQR]
    );
    
    console.log(`📊 Resultados de búsqueda: ${personas.length} persona(s) encontrada(s)`);
    
    if (personas.length === 0) {
      console.log('❌ Persona no encontrada con código QR:', codigoQR);
      return res.status(404).json({ 
        error: true, 
        message: 'Persona no encontrada con ese código QR',
        debug: {
          codigoQRBuscado: codigoQR
        }
      });
    }
    
    const persona = personas[0];
    
    // Verificar que la persona esté activa
    if (persona.estado !== 'ACTIVO') {
      return res.status(403).json({ 
        error: true, 
        message: `No se puede registrar acceso. Estado de la persona: ${persona.estado}` 
      });
    }
    
    // Determinar automáticamente si es entrada o salida
    // Obtener último registro de la persona
    const [ultimoRegistro] = await db.query(`
      SELECT tipo, fecha_entrada, fecha_salida
      FROM registros_entrada_salida 
      WHERE id_persona = ? 
      ORDER BY 
        COALESCE(fecha_entrada, fecha_salida) DESC,
        id_registro_entrada_salida DESC
      LIMIT 1
    `, [persona.id_persona]);
    
    // SIEMPRE determinar automáticamente el tipo basándose en el último registro
    // Ignorar el tipo enviado por el frontend para evitar inconsistencias
    let tipoFinal;
    
    if (ultimoRegistro.length === 0) {
      // No tiene registros previos, debe ser entrada
      tipoFinal = 'ENTRADA';
      console.log('🔄 No hay registros previos. Tipo determinado: ENTRADA');
    } else {
      const ultimoTipo = ultimoRegistro[0].tipo;
      
      // Lógica simplificada: si el último registro es ENTRADA, el siguiente es SALIDA
      // Si el último registro es SALIDA, el siguiente es ENTRADA
      if (ultimoTipo === 'ENTRADA') {
        // El último registro fue ENTRADA, ahora debe ser SALIDA
        tipoFinal = 'SALIDA';
        console.log('🔄 Último registro: ENTRADA. Tipo determinado: SALIDA');
      } else if (ultimoTipo === 'SALIDA') {
        // El último registro fue SALIDA, ahora debe ser ENTRADA
        tipoFinal = 'ENTRADA';
        console.log('🔄 Último registro: SALIDA. Tipo determinado: ENTRADA');
      } else {
        // Por defecto, si no se puede determinar, es ENTRADA
        tipoFinal = 'ENTRADA';
        console.log('🔄 Tipo del último registro desconocido. Tipo determinado: ENTRADA (por defecto)');
      }
    }
    
    console.log('✅ Tipo final determinado automáticamente:', tipoFinal);
    
    // Registrar el acceso con TIMESTAMP completo (fecha y hora)
    const fechaHoraAhora = new Date(); // TIMESTAMP completo con hora exacta
    
    console.log('💾 Insertando registro en BD...');
    console.log('   Persona ID:', persona.id_persona);
    console.log('   Persona:', `${persona.nombres} ${persona.apellidos || ''}`.trim());
    console.log('   Tipo:', tipoFinal, tipoFinal !== tipo ? `(cambiado de ${tipo})` : '');
    console.log('   Fecha y Hora:', fechaHoraAhora.toISOString());
    
    if (tipoFinal === 'ENTRADA') {
      // Crear nuevo registro de entrada (solo con fecha_entrada, sin fecha_salida)
      await db.query(
        `INSERT INTO registros_entrada_salida (id_persona, tipo, fecha_entrada)
         VALUES (?, ?, ?)`,
        [persona.id_persona, tipoFinal, fechaHoraAhora]
      );
      console.log('✅ Registro de ENTRADA creado con hora exacta');
    } else {
      // Para salida, crear un NUEVO registro de salida
      // Buscar la entrada previa para incluir su fecha_entrada en el nuevo registro de salida
      let fechaEntradaAnterior = null;
      
      const [entradaPrevia] = await db.query(
        `SELECT fecha_entrada 
         FROM registros_entrada_salida 
         WHERE id_persona = ? AND tipo = 'ENTRADA'
         ORDER BY fecha_entrada DESC 
         LIMIT 1`,
        [persona.id_persona]
      );
      
      if (entradaPrevia.length > 0) {
        fechaEntradaAnterior = entradaPrevia[0].fecha_entrada;
        console.log('📅 Incluyendo fecha_entrada anterior en registro de SALIDA:', fechaEntradaAnterior);
      }
      
      await db.query(
        `INSERT INTO registros_entrada_salida (id_persona, tipo, fecha_entrada, fecha_salida)
         VALUES (?, ?, ?, ?)`,
        [persona.id_persona, tipoFinal, fechaEntradaAnterior, fechaHoraAhora]
      );
      console.log('✅ Registro de SALIDA creado con hora exacta');
    }
    
    console.log('✅ Registro insertado exitosamente');
    
    // Obtener el registro creado (siempre es un nuevo registro)
    const [nuevoRegistro] = await db.query(`
      SELECT 
        r.id_registro_entrada_salida as id,
        r.id_persona as personaId,
        r.tipo,
        r.fecha_entrada,
        r.fecha_salida,
        p.nombres,
        p.apellidos,
        p.documento,
        p.codigo_qr as codigoQR,
        p.programa,
        p.ficha
      FROM registros_entrada_salida r
      INNER JOIN personas p ON r.id_persona = p.id_persona
      WHERE r.id_persona = ?
      ORDER BY r.id_registro_entrada_salida DESC
      LIMIT 1
    `, [persona.id_persona]);
    
    console.log('✅ Registro creado exitosamente');
    
    // El tipo siempre se determina automáticamente, así que el mensaje siempre indica esto
    const mensaje = `${tipoFinal} registrada correctamente para ${persona.nombres} ${persona.apellidos || ''}`;
    
    res.status(201).json({ 
      success: true, 
      data: nuevoRegistro[0],
      message: mensaje,
      tipoRegistrado: tipoFinal
    });
  } catch (error) {
    console.error('❌ Error al registrar entrada/salida:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: true, message: 'Error al registrar entrada/salida: ' + error.message });
  }
});

// Obtener historial de una persona
router.get('/persona/:personaId', async (req, res) => {
  try {
    const [registros] = await db.query(`
      SELECT 
        r.id_registro_entrada_salida as id,
        r.tipo,
        r.fecha_entrada,
        r.fecha_salida
      FROM registros_entrada_salida r
      WHERE r.id_persona = ?
      ORDER BY COALESCE(r.fecha_entrada, r.fecha_salida) DESC
      LIMIT 50
    `, [req.params.personaId]);
    
    res.json({ success: true, data: registros });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: true, message: 'Error al obtener historial' });
  }
});

// Obtener estado actual de una persona (dentro o fuera)
router.get('/estado/:personaId', async (req, res) => {
  try {
    const [ultimoRegistro] = await db.query(`
      SELECT tipo, fecha_entrada, fecha_salida
      FROM registros_entrada_salida
      WHERE id_persona = ?
      ORDER BY COALESCE(fecha_entrada, fecha_salida) DESC
      LIMIT 1
    `, [req.params.personaId]);
    
    if (ultimoRegistro.length === 0) {
      return res.json({ 
        success: true, 
        data: { estado: 'FUERA', ultimoRegistro: null } 
      });
    }
    
    const estado = ultimoRegistro[0].tipo === 'ENTRADA' ? 'DENTRO' : 'FUERA';
    
    res.json({ 
      success: true, 
      data: { estado, ultimoRegistro: ultimoRegistro[0] } 
    });
  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json({ error: true, message: 'Error al obtener estado' });
  }
});

// Obtener estadísticas básicas
router.get('/estadisticas', async (req, res) => {
  try {
    // Estadísticas del día actual
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_registros,
        SUM(CASE WHEN tipo = 'ENTRADA' THEN 1 ELSE 0 END) as entradas,
        SUM(CASE WHEN tipo = 'SALIDA' THEN 1 ELSE 0 END) as salidas
      FROM registros_entrada_salida
      WHERE DATE(fecha_entrada) = CURDATE() OR DATE(fecha_salida) = CURDATE()
    `);
    
    // Personas actualmente dentro
    const [personasDentro] = await db.query(`
      SELECT COUNT(DISTINCT p.id_persona) as total
      FROM personas p
      INNER JOIN (
        SELECT 
          id_persona,
          tipo,
          ROW_NUMBER() OVER (PARTITION BY id_persona ORDER BY COALESCE(fecha_entrada, fecha_salida) DESC) as rn
        FROM registros_entrada_salida
      ) r ON p.id_persona = r.id_persona AND r.rn = 1 AND r.tipo = 'ENTRADA'
      WHERE p.estado = 'ACTIVO'
    `);
    
    const estadisticas = {
      totalRegistrosHoy: stats[0].total_registros || 0,
      entradasHoy: stats[0].entradas || 0,
      salidasHoy: stats[0].salidas || 0,
      personasDentro: personasDentro[0].total || 0
    };
    
    res.json({ success: true, data: estadisticas });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: true, message: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
