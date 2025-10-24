import express from 'express';
import { pool } from '../config/database.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// ============================================
// GET /api/stats - Obtener estadísticas generales
// ============================================
router.get('/', verificarToken, async (req, res) => {
  try {
    // Obtener registros de hoy
    const [todayRecords] = await pool.query(`
      SELECT 
        ar.id, ar.persona_id, ar.tipo,
        p.rol, p.estado
      FROM access_records ar
      INNER JOIN persons p ON ar.persona_id = p.id
      WHERE DATE(ar.timestamp) = CURDATE()
    `);

    // Calcular quién está dentro (último registro debe ser ENTRADA)
    const personaStatus = new Map();
    
    // Obtener todas las personas activas
    const [allPersons] = await pool.query(`
      SELECT id, rol, estado FROM persons
    `);

    // Obtener el último registro de cada persona
    for (const person of allPersons) {
      const [lastRecord] = await pool.query(`
        SELECT tipo FROM access_records
        WHERE persona_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `, [person.id]);

      if (lastRecord.length > 0) {
        personaStatus.set(person.id, {
          tipo: lastRecord[0].tipo,
          rol: person.rol,
          estado: person.estado
        });
      }
    }

    // Contar personas dentro por rol
    let estudiantesDentro = 0;
    let instructoresDentro = 0;
    let administrativosDentro = 0;
    let visitantesDentro = 0;

    const estadosPermitidos = ['ACTIVO', 'EN FORMACION', 'POR CERTIFICAR', 'CERTIFICADO'];

    personaStatus.forEach((status, personId) => {
      if (status.tipo === 'ENTRADA' && estadosPermitidos.includes(status.estado)) {
        switch (status.rol) {
          case 'ESTUDIANTE':
            estudiantesDentro++;
            break;
          case 'INSTRUCTOR':
            instructoresDentro++;
            break;
          case 'ADMINISTRATIVO':
            administrativosDentro++;
            break;
          case 'VISITANTE':
            visitantesDentro++;
            break;
        }
      }
    });

    const totalPersonasDentro = estudiantesDentro + instructoresDentro + administrativosDentro + visitantesDentro;

    res.json({
      success: true,
      data: {
        totalPersonasDentro,
        accesosDia: todayRecords.length,
        estudiantesDentro,
        instructoresDentro,
        administrativosDentro,
        visitantesDentro
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// ============================================
// GET /api/stats/daily - Estadísticas diarias
// ============================================
router.get('/daily', verificarToken, async (req, res) => {
  try {
    const { fecha } = req.query;
    const targetDate = fecha || new Date().toISOString().split('T')[0];

    const [stats] = await pool.query(`
      SELECT * FROM vista_estadisticas WHERE fecha = ?
    `, [targetDate]);

    if (stats.length === 0) {
      return res.json({
        success: true,
        data: {
          fecha: targetDate,
          total_accesos: 0,
          personas_unicas: 0,
          total_entradas: 0,
          total_salidas: 0,
          entradas_estudiantes: 0,
          entradas_instructores: 0,
          entradas_administrativos: 0,
          entradas_visitantes: 0
        }
      });
    }

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error al obtener estadísticas diarias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas diarias',
      error: error.message
    });
  }
});

// ============================================
// GET /api/stats/range - Estadísticas por rango de fechas
// ============================================
router.get('/range', verificarToken, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren fechaInicio y fechaFin'
      });
    }

    const [stats] = await pool.query(`
      SELECT * FROM vista_estadisticas 
      WHERE fecha BETWEEN ? AND ?
      ORDER BY fecha ASC
    `, [fechaInicio, fechaFin]);

    res.json({
      success: true,
      data: stats,
      count: stats.length
    });
  } catch (error) {
    console.error('Error al obtener estadísticas por rango:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// ============================================
// GET /api/stats/summary - Resumen general del sistema
// ============================================
router.get('/summary', verificarToken, async (req, res) => {
  try {
    // Total de personas
    const [totalPersons] = await pool.query('SELECT COUNT(*) as total FROM persons');
    
    // Total por rol
    const [personsByRole] = await pool.query(`
      SELECT rol, COUNT(*) as total FROM persons GROUP BY rol
    `);

    // Total de accesos
    const [totalAccess] = await pool.query('SELECT COUNT(*) as total FROM access_records');

    // Accesos de hoy
    const [todayAccess] = await pool.query(`
      SELECT COUNT(*) as total FROM access_records WHERE DATE(timestamp) = CURDATE()
    `);

    // QRs activos de visitantes
    const [activeQRs] = await pool.query(`
      SELECT COUNT(*) as total FROM visitor_qrs 
      WHERE estado = 'ACTIVO' AND fecha_expiracion > NOW()
    `);

    res.json({
      success: true,
      data: {
        totalPersonas: totalPersons[0].total,
        personasPorRol: personsByRole,
        totalAccesos: totalAccess[0].total,
        accesosHoy: todayAccess[0].total,
        qrsActivosVisitantes: activeQRs[0].total
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen',
      error: error.message
    });
  }
});

export default router;
