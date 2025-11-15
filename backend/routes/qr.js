const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken } = require('./auth');
const { v4: uuidv4 } = require('uuid');

// Middleware de autenticación
router.use(verificarToken);

// Obtener todos los códigos QR de visitantes
router.get('/', async (req, res) => {
  try {
    const { estado, visitanteId } = req.query;
    let query = `
      SELECT 
        q.id,
        q.visitante_id as visitanteId,
        q.codigo_qr as codigoQR,
        q.fecha_generacion as fechaGeneracion,
        q.fecha_expiracion as fechaExpiracion,
        q.estado,
        q.generado_por as generadoPor,
        v.nombre,
        v.apellido,
        v.documento,
        v.tipo_sangre as tipoSangre,
        u.nombre as generadoPorNombre
      FROM codigos_qr_visitantes q
      INNER JOIN visitantes v ON q.visitante_id = v.id
      LEFT JOIN usuarios u ON q.generado_por = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (estado) {
      query += ' AND q.estado = ?';
      params.push(estado);
    }
    
    if (visitanteId) {
      query += ' AND q.visitante_id = ?';
      params.push(visitanteId);
    }
    
    query += ' ORDER BY q.fecha_generacion DESC';
    
    const [qrs] = await db.query(query, params);
    res.json({ success: true, data: qrs });
  } catch (error) {
    console.error('Error al obtener códigos QR:', error);
    res.status(500).json({ error: true, message: 'Error al obtener códigos QR' });
  }
});

// Obtener código QR por código
router.get('/codigo/:codigo', async (req, res) => {
  try {
    const [qrs] = await db.query(`
      SELECT 
        q.id,
        q.visitante_id as visitanteId,
        q.codigo_qr as codigoQR,
        q.fecha_generacion as fechaGeneracion,
        q.fecha_expiracion as fechaExpiracion,
        q.estado,
        q.generado_por as generadoPor,
        v.nombre,
        v.apellido,
        v.documento,
        v.tipo_documento as tipoDocumento,
        v.tipo_sangre as tipoSangre
      FROM codigos_qr_visitantes q
      INNER JOIN visitantes v ON q.visitante_id = v.id
      WHERE q.codigo_qr = ?
    `, [req.params.codigo]);
    
    if (qrs.length === 0) {
      return res.status(404).json({ error: true, message: 'Código QR no encontrado' });
    }
    
    const qr = qrs[0];
    
    // Verificar si está expirado
    if (new Date(qr.fechaExpiracion) < new Date() && qr.estado === 'ACTIVO') {
      await db.query('UPDATE codigos_qr_visitantes SET estado = ? WHERE id = ?', ['EXPIRADO', qr.id]);
      qr.estado = 'EXPIRADO';
    }
    
    res.json({ success: true, data: qr });
  } catch (error) {
    console.error('Error al obtener código QR:', error);
    res.status(500).json({ error: true, message: 'Error al obtener código QR' });
  }
});

// Generar nuevo código QR para visitante
router.post('/', async (req, res) => {
  try {
    const { visitanteId, horasValidez = 24 } = req.body;
    
    if (!visitanteId) {
      return res.status(400).json({ error: true, message: 'visitanteId es requerido' });
    }
    
    // Verificar que el visitante existe
    const [visitantes] = await db.query(
      'SELECT * FROM visitantes WHERE id = ? AND estado = ?',
      [visitanteId, 'ACTIVO']
    );
    
    if (visitantes.length === 0) {
      return res.status(404).json({ 
        error: true, 
        message: 'Visitante no encontrado o inactivo' 
      });
    }
    
    const id = uuidv4();
    const visitante = visitantes[0];
    const codigoQR = `VISITOR_${visitante.documento}_${Date.now()}`;
    const fechaExpiracion = new Date();
    fechaExpiracion.setHours(fechaExpiracion.getHours() + parseInt(horasValidez));
    
    await db.query(
      `INSERT INTO codigos_qr_visitantes (id, visitante_id, codigo_qr, fecha_expiracion, estado, generado_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, visitanteId, codigoQR, fechaExpiracion, 'ACTIVO', req.usuario.id]
    );
    
    const [nuevoQR] = await db.query(`
      SELECT 
        q.id,
        q.visitante_id as visitanteId,
        q.codigo_qr as codigoQR,
        q.fecha_generacion as fechaGeneracion,
        q.fecha_expiracion as fechaExpiracion,
        q.estado,
        q.generado_por as generadoPor,
        v.nombre,
        v.apellido,
        v.documento,
        v.tipo_sangre as tipoSangre
      FROM codigos_qr_visitantes q
      INNER JOIN visitantes v ON q.visitante_id = v.id
      WHERE q.id = ?
    `, [id]);
    
    console.log(`✅ QR generado para visitante ${visitante.nombre} (${visitante.documento})`);
    console.log(`   Código: ${codigoQR}`);
    console.log(`   Expira: ${fechaExpiracion.toLocaleString('es-CO')}`);
    
    res.status(201).json({ success: true, data: nuevoQR[0] });
  } catch (error) {
    console.error('Error al generar código QR:', error);
    res.status(500).json({ error: true, message: 'Error al generar código QR' });
  }
});

// Validar código QR (verificar si es válido para acceso)
router.post('/validar', async (req, res) => {
  try {
    const { codigoQR } = req.body;
    
    if (!codigoQR) {
      return res.status(400).json({ error: true, message: 'codigoQR es requerido' });
    }
    
    console.log(`🔍 Validando QR: ${codigoQR}`);
    
    const [qrs] = await db.query(`
      SELECT 
        q.id,
        q.visitante_id as visitanteId,
        q.codigo_qr as codigoQR,
        q.fecha_expiracion as fechaExpiracion,
        q.estado,
        v.nombre,
        v.apellido,
        v.documento,
        v.tipo_documento as tipoDocumento,
        v.tipo_sangre as tipoSangre,
        v.estado as estadoVisitante
      FROM codigos_qr_visitantes q
      INNER JOIN visitantes v ON q.visitante_id = v.id
      WHERE q.codigo_qr = ?
    `, [codigoQR]);
    
    if (qrs.length === 0) {
      console.log('❌ QR no encontrado');
      return res.json({ 
        success: true, 
        valido: false, 
        mensaje: 'Código QR no encontrado' 
      });
    }
    
    const qr = qrs[0];
    const ahora = new Date();
    const fechaExpiracion = new Date(qr.fechaExpiracion);
    
    // Verificar si está expirado
    if (fechaExpiracion < ahora) {
      console.log(`⏰ QR expirado (expiró: ${fechaExpiracion.toLocaleString('es-CO')})`);
      await db.query('UPDATE codigos_qr_visitantes SET estado = ? WHERE id = ?', ['EXPIRADO', qr.id]);
      return res.json({ 
        success: true, 
        valido: false, 
        mensaje: 'Código QR expirado' 
      });
    }
    
    // Verificar estado del QR
    if (qr.estado !== 'ACTIVO') {
      console.log(`❌ QR con estado: ${qr.estado}`);
      return res.json({ 
        success: true, 
        valido: false, 
        mensaje: `Código QR ${qr.estado.toLowerCase()}` 
      });
    }
    
    // Verificar estado del visitante
    if (qr.estadoVisitante !== 'ACTIVO') {
      console.log(`❌ Visitante con estado: ${qr.estadoVisitante}`);
      return res.json({ 
        success: true, 
        valido: false, 
        mensaje: `Visitante en estado: ${qr.estadoVisitante}` 
      });
    }
    
    console.log(`✅ QR válido para ${qr.nombre} ${qr.apellido || ''}`);
    
    res.json({ 
      success: true, 
      valido: true, 
      mensaje: 'Código QR válido',
      data: {
        visitanteId: qr.visitanteId,
        qrId: qr.id,
        nombre: qr.nombre,
        apellido: qr.apellido,
        documento: qr.documento,
        tipoDocumento: qr.tipoDocumento,
        tipoSangre: qr.tipoSangre,
        fechaExpiracion: qr.fechaExpiracion,
        horasRestantes: Math.round((fechaExpiracion - ahora) / (1000 * 60 * 60))
      }
    });
  } catch (error) {
    console.error('Error al validar código QR:', error);
    res.status(500).json({ error: true, message: 'Error al validar código QR' });
  }
});

// Revocar código QR (marcarlo como inactivo)
router.put('/:id/revocar', async (req, res) => {
  try {
    const [resultado] = await db.query(
      'UPDATE codigos_qr_visitantes SET estado = ? WHERE id = ? AND estado = ?',
      ['EXPIRADO', req.params.id, 'ACTIVO']
    );
    
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ 
        error: true, 
        message: 'Código QR no encontrado o ya no está activo' 
      });
    }
    
    res.json({ success: true, message: 'Código QR revocado correctamente' });
  } catch (error) {
    console.error('Error al revocar código QR:', error);
    res.status(500).json({ error: true, message: 'Error al revocar código QR' });
  }
});

module.exports = router;


