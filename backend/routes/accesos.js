const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken } = require('./auth');

// Middleware de autenticación
router.use(verificarToken);

// Obtener todos los registros de acceso (alias para entradas_salidas)
router.get('/', async (req, res) => {
  try {
    const { fecha, fechaDesde, fechaHasta, tipo, personaId, limit = 100 } = req.query;
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
        p.ficha,
        'Entrada Principal' as ubicacion,
        COALESCE(r.fecha_entrada, r.fecha_salida) as timestamp
      FROM registros_entrada_salida r
      INNER JOIN personas p ON r.id_persona = p.id_persona
      WHERE 1=1
    `;
    const params = [];
    
    if (fecha) {
      query += ' AND (DATE(r.fecha_entrada) = ? OR DATE(r.fecha_salida) = ?)';
      params.push(fecha, fecha);
    } else {
      // Si hay rango de fechas
      if (fechaDesde) {
        query += ' AND (DATE(r.fecha_entrada) >= ? OR DATE(r.fecha_salida) >= ?)';
        params.push(fechaDesde, fechaDesde);
      }
      if (fechaHasta) {
        query += ' AND (DATE(r.fecha_entrada) <= ? OR DATE(r.fecha_salida) <= ?)';
        params.push(fechaHasta, fechaHasta);
      }
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
        p.ficha,
        'Entrada Principal' as ubicacion,
        COALESCE(r.fecha_entrada, r.fecha_salida) as timestamp
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

// Obtener estadísticas
router.get('/estadisticas', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM registros_entrada_salida WHERE tipo = 'ENTRADA') as total_entradas,
        (SELECT COUNT(*) FROM registros_entrada_salida WHERE tipo = 'SALIDA') as total_salidas,
        (SELECT COUNT(*) FROM registros_entrada_salida 
         WHERE DATE(fecha_entrada) = CURDATE() OR DATE(fecha_salida) = CURDATE()) as registros_hoy,
        (SELECT COUNT(DISTINCT id_persona) FROM registros_entrada_salida 
         WHERE DATE(fecha_entrada) = CURDATE() OR DATE(fecha_salida) = CURDATE()) as personas_hoy
    `);
    
    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: true, message: 'Error al obtener estadísticas' });
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
        r.fecha_salida,
        COALESCE(r.fecha_entrada, r.fecha_salida) as timestamp
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
      return res.json({ success: true, data: { estado: 'FUERA', ultimoRegistro: null } });
    }
    
    const ultimo = ultimoRegistro[0];
    const estado = ultimo.tipo === 'ENTRADA' && !ultimo.fecha_salida ? 'DENTRO' : 'FUERA';
    
    res.json({ 
      success: true, 
      data: { 
        estado,
        ultimoRegistro: ultimo 
      } 
    });
  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json({ error: true, message: 'Error al obtener estado' });
  }
});

module.exports = router;


