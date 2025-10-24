import express from 'express';
import { pool } from '../config/database.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// ============================================
// GET /api/access - Obtener registros de acceso
// ============================================
router.get('/', verificarToken, async (req, res) => {
  try {
    const { fecha, tipo, personaId, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        ar.id, ar.persona_id, ar.tipo, ar.timestamp, ar.ubicacion, ar.codigo_qr,
        p.nombre, p.apellido, p.documento, p.rol, p.tipo_sangre, p.foto
      FROM access_records ar
      INNER JOIN persons p ON ar.persona_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (fecha) {
      query += ' AND DATE(ar.timestamp) = ?';
      params.push(fecha);
    }

    if (tipo) {
      query += ' AND ar.tipo = ?';
      params.push(tipo);
    }

    if (personaId) {
      query += ' AND ar.persona_id = ?';
      params.push(personaId);
    }

    query += ' ORDER BY ar.timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [records] = await pool.query(query, params);

    // Transformar datos para que coincidan con el formato del frontend
    const transformedRecords = records.map(record => ({
      id: record.id.toString(),
      personaId: record.persona_id.toString(),
      persona: {
        id: record.persona_id.toString(),
        nombre: record.nombre,
        apellido: record.apellido,
        documento: record.documento,
        rol: record.rol,
        tipoSangre: record.tipo_sangre,
        foto: record.foto
      },
      tipo: record.tipo,
      timestamp: record.timestamp,
      ubicacion: record.ubicacion,
      codigoQR: record.codigo_qr
    }));

    res.json({
      success: true,
      data: transformedRecords,
      count: transformedRecords.length
    });
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros de acceso',
      error: error.message
    });
  }
});

// ============================================
// GET /api/access/today - Registros de hoy
// ============================================
router.get('/today', verificarToken, async (req, res) => {
  try {
    const [records] = await pool.query(`
      SELECT 
        ar.id, ar.persona_id, ar.tipo, ar.timestamp, ar.ubicacion, ar.codigo_qr,
        p.nombre, p.apellido, p.documento, p.rol, p.tipo_sangre, p.foto
      FROM access_records ar
      INNER JOIN persons p ON ar.persona_id = p.id
      WHERE DATE(ar.timestamp) = CURDATE()
      ORDER BY ar.timestamp DESC
    `);

    const transformedRecords = records.map(record => ({
      id: record.id.toString(),
      personaId: record.persona_id.toString(),
      persona: {
        id: record.persona_id.toString(),
        nombre: record.nombre,
        apellido: record.apellido,
        documento: record.documento,
        rol: record.rol,
        tipoSangre: record.tipo_sangre,
        foto: record.foto
      },
      tipo: record.tipo,
      timestamp: record.timestamp,
      ubicacion: record.ubicacion,
      codigoQR: record.codigo_qr
    }));

    res.json({
      success: true,
      data: transformedRecords
    });
  } catch (error) {
    console.error('Error al obtener registros de hoy:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros',
      error: error.message
    });
  }
});

// ============================================
// POST /api/access - Registrar acceso (entrada/salida)
// ============================================
router.post('/', verificarToken, async (req, res) => {
  try {
    const { personaId, tipo, ubicacion, codigoQR } = req.body;

    // Validar datos
    if (!personaId || !tipo || !ubicacion || !codigoQR) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    if (!['ENTRADA', 'SALIDA'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de acceso inválido'
      });
    }

    // Verificar que la persona existe
    const [persons] = await pool.query(
      'SELECT * FROM persons WHERE id = ?',
      [personaId]
    );

    if (persons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    const person = persons[0];

    // Verificar que la persona está activa
    const estadosPermitidos = ['ACTIVO', 'EN FORMACION', 'POR CERTIFICAR', 'CERTIFICADO'];
    if (!estadosPermitidos.includes(person.estado)) {
      return res.status(403).json({
        success: false,
        message: 'La persona no tiene acceso autorizado',
        estado: person.estado
      });
    }

    // Registrar acceso
    const [result] = await pool.query(
      'INSERT INTO access_records (persona_id, tipo, ubicacion, codigo_qr) VALUES (?, ?, ?, ?)',
      [personaId, tipo, ubicacion, codigoQR]
    );

    // Obtener el registro creado con los datos de la persona
    const [newRecord] = await pool.query(`
      SELECT 
        ar.id, ar.persona_id, ar.tipo, ar.timestamp, ar.ubicacion, ar.codigo_qr,
        p.nombre, p.apellido, p.documento, p.tipo_documento, p.rol, p.tipo_sangre, p.foto, p.estado
      FROM access_records ar
      INNER JOIN persons p ON ar.persona_id = p.id
      WHERE ar.id = ?
    `, [result.insertId]);

    const record = newRecord[0];

    res.status(201).json({
      success: true,
      message: `${tipo === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada exitosamente`,
      data: {
        id: record.id.toString(),
        personaId: record.persona_id.toString(),
        persona: {
          id: record.persona_id.toString(),
          nombre: record.nombre,
          apellido: record.apellido,
          documento: record.documento,
          tipoDocumento: record.tipo_documento,
          rol: record.rol,
          estado: record.estado,
          tipoSangre: record.tipo_sangre,
          foto: record.foto
        },
        tipo: record.tipo,
        timestamp: record.timestamp,
        ubicacion: record.ubicacion,
        codigoQR: record.codigo_qr
      }
    });
  } catch (error) {
    console.error('Error al registrar acceso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar acceso',
      error: error.message
    });
  }
});

// ============================================
// GET /api/access/person/:personaId - Historial de una persona
// ============================================
router.get('/person/:personaId', verificarToken, async (req, res) => {
  try {
    const { personaId } = req.params;

    const [records] = await pool.query(`
      SELECT 
        ar.id, ar.persona_id, ar.tipo, ar.timestamp, ar.ubicacion, ar.codigo_qr
      FROM access_records ar
      WHERE ar.persona_id = ?
      ORDER BY ar.timestamp DESC
    `, [personaId]);

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message
    });
  }
});

export default router;
