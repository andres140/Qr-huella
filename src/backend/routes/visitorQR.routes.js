import express from 'express';
import { pool } from '../config/database.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// ============================================
// GET /api/visitor-qrs - Obtener todos los QRs de visitantes
// ============================================
router.get('/', verificarToken, async (req, res) => {
  try {
    const { estado } = req.query;

    let query = `
      SELECT 
        vq.id, vq.visitante_id, vq.codigo_qr, vq.fecha_generacion, 
        vq.fecha_expiracion, vq.estado, vq.generado_por,
        p.nombre, p.apellido, p.documento, p.rol, p.tipo_sangre,
        u.nombre as generador_nombre
      FROM visitor_qrs vq
      INNER JOIN persons p ON vq.visitante_id = p.id
      INNER JOIN users u ON vq.generado_por = u.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ' AND vq.estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY vq.fecha_generacion DESC';

    const [qrs] = await pool.query(query, params);

    // Transformar datos
    const transformedQRs = qrs.map(qr => ({
      id: qr.id.toString(),
      visitante: {
        id: qr.visitante_id.toString(),
        nombre: qr.nombre,
        apellido: qr.apellido,
        documento: qr.documento,
        rol: qr.rol,
        tipoSangre: qr.tipo_sangre
      },
      codigoQR: qr.codigo_qr,
      fechaGeneracion: qr.fecha_generacion,
      fechaExpiracion: qr.fecha_expiracion,
      estado: qr.estado,
      generadoPor: qr.generado_por.toString(),
      generadorNombre: qr.generador_nombre
    }));

    res.json({
      success: true,
      data: transformedQRs,
      count: transformedQRs.length
    });
  } catch (error) {
    console.error('Error al obtener QRs de visitantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener QRs de visitantes',
      error: error.message
    });
  }
});

// ============================================
// GET /api/visitor-qrs/active - Obtener QRs activos
// ============================================
router.get('/active', verificarToken, async (req, res) => {
  try {
    const [qrs] = await pool.query(`
      SELECT 
        vq.id, vq.visitante_id, vq.codigo_qr, vq.fecha_generacion, 
        vq.fecha_expiracion, vq.estado, vq.generado_por,
        p.nombre, p.apellido, p.documento, p.rol, p.tipo_sangre
      FROM visitor_qrs vq
      INNER JOIN persons p ON vq.visitante_id = p.id
      WHERE vq.estado = 'ACTIVO' AND vq.fecha_expiracion > NOW()
      ORDER BY vq.fecha_generacion DESC
    `);

    const transformedQRs = qrs.map(qr => ({
      id: qr.id.toString(),
      visitante: {
        id: qr.visitante_id.toString(),
        nombre: qr.nombre,
        apellido: qr.apellido,
        documento: qr.documento,
        rol: qr.rol,
        tipoSangre: qr.tipo_sangre
      },
      codigoQR: qr.codigo_qr,
      fechaGeneracion: qr.fecha_generacion,
      fechaExpiracion: qr.fecha_expiracion,
      estado: qr.estado,
      generadoPor: qr.generado_por.toString()
    }));

    res.json({
      success: true,
      data: transformedQRs
    });
  } catch (error) {
    console.error('Error al obtener QRs activos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener QRs activos',
      error: error.message
    });
  }
});

// ============================================
// POST /api/visitor-qrs - Generar QR para visitante
// ============================================
router.post('/', verificarToken, async (req, res) => {
  try {
    const { visitanteId, codigoQR, duracionHoras = 24 } = req.body;

    if (!visitanteId || !codigoQR) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    // Verificar que el visitante existe
    const [persons] = await pool.query(
      'SELECT * FROM persons WHERE id = ?',
      [visitanteId]
    );

    if (persons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Visitante no encontrado'
      });
    }

    // Calcular fecha de expiración
    const fechaExpiracion = new Date();
    fechaExpiracion.setHours(fechaExpiracion.getHours() + duracionHoras);

    // Insertar QR
    const [result] = await pool.query(
      `INSERT INTO visitor_qrs 
      (visitante_id, codigo_qr, fecha_expiracion, estado, generado_por) 
      VALUES (?, ?, ?, ?, ?)`,
      [visitanteId, codigoQR, fechaExpiracion, 'ACTIVO', req.user.id]
    );

    // Obtener el QR creado
    const [newQR] = await pool.query(`
      SELECT 
        vq.id, vq.visitante_id, vq.codigo_qr, vq.fecha_generacion, 
        vq.fecha_expiracion, vq.estado, vq.generado_por,
        p.nombre, p.apellido, p.documento, p.rol, p.tipo_sangre
      FROM visitor_qrs vq
      INNER JOIN persons p ON vq.visitante_id = p.id
      WHERE vq.id = ?
    `, [result.insertId]);

    const qr = newQR[0];

    res.status(201).json({
      success: true,
      message: 'QR de visitante generado exitosamente',
      data: {
        id: qr.id.toString(),
        visitante: {
          id: qr.visitante_id.toString(),
          nombre: qr.nombre,
          apellido: qr.apellido,
          documento: qr.documento,
          rol: qr.rol,
          tipoSangre: qr.tipo_sangre
        },
        codigoQR: qr.codigo_qr,
        fechaGeneracion: qr.fecha_generacion,
        fechaExpiracion: qr.fecha_expiracion,
        estado: qr.estado,
        generadoPor: qr.generado_por.toString()
      }
    });
  } catch (error) {
    console.error('Error al generar QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar QR de visitante',
      error: error.message
    });
  }
});

// ============================================
// PUT /api/visitor-qrs/:id/status - Actualizar estado del QR
// ============================================
router.put('/:id/status', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['ACTIVO', 'EXPIRADO', 'USADO'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    await pool.query(
      'UPDATE visitor_qrs SET estado = ? WHERE id = ?',
      [estado, id]
    );

    const [updated] = await pool.query(
      'SELECT * FROM visitor_qrs WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado',
      error: error.message
    });
  }
});

// ============================================
// DELETE /api/visitor-qrs/:id - Eliminar QR
// ============================================
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM visitor_qrs WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'QR eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar QR',
      error: error.message
    });
  }
});

export default router;
