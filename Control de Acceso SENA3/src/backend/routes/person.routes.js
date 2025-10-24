import express from 'express';
import { pool } from '../config/database.js';
import { verificarToken, verificarAdmin } from '../middleware/auth.middleware.js';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import xlsx from 'xlsx';

const router = express.Router();

// Configurar multer para carga de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 } // 10MB
});

// ============================================
// GET /api/persons - Obtener todas las personas
// ============================================
router.get('/', verificarToken, async (req, res) => {
  try {
    const { rol, estado, search } = req.query;
    
    let query = 'SELECT * FROM persons WHERE 1=1';
    const params = [];

    if (rol) {
      query += ' AND rol = ?';
      params.push(rol);
    }

    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    if (search) {
      query += ' AND (nombre LIKE ? OR apellido LIKE ? OR documento LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY nombre ASC';

    const [persons] = await pool.query(query, params);

    res.json({
      success: true,
      data: persons,
      count: persons.length
    });
  } catch (error) {
    console.error('Error al obtener personas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener personas',
      error: error.message
    });
  }
});

// ============================================
// GET /api/persons/:id - Obtener persona por ID
// ============================================
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [persons] = await pool.query(
      'SELECT * FROM persons WHERE id = ?',
      [id]
    );

    if (persons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    res.json({
      success: true,
      data: persons[0]
    });
  } catch (error) {
    console.error('Error al obtener persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener persona',
      error: error.message
    });
  }
});

// ============================================
// GET /api/persons/documento/:documento - Buscar por documento
// ============================================
router.get('/documento/:documento', verificarToken, async (req, res) => {
  try {
    const { documento } = req.params;

    const [persons] = await pool.query(
      'SELECT * FROM persons WHERE documento = ?',
      [documento]
    );

    if (persons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    res.json({
      success: true,
      data: persons[0]
    });
  } catch (error) {
    console.error('Error al buscar persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar persona',
      error: error.message
    });
  }
});

// ============================================
// POST /api/persons - Crear nueva persona
// ============================================
router.post('/',
  verificarToken,
  verificarAdmin,
  [
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('documento').notEmpty().withMessage('El documento es requerido'),
    body('tipoDocumento').isIn(['CC', 'TI', 'CE', 'PASAPORTE']).withMessage('Tipo de documento inválido'),
    body('rol').isIn(['ESTUDIANTE', 'INSTRUCTOR', 'ADMINISTRATIVO', 'VISITANTE']).withMessage('Rol inválido'),
    body('tipoSangre').isIn(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']).withMessage('Tipo de sangre inválido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
      }

      const {
        nombre,
        apellido,
        documento,
        tipoDocumento,
        programa,
        ficha,
        rol,
        estado,
        tipoSangre,
        foto
      } = req.body;

      // Verificar si el documento ya existe
      const [existing] = await pool.query(
        'SELECT id FROM persons WHERE documento = ?',
        [documento]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una persona con este número de documento'
        });
      }

      // Insertar persona
      const [result] = await pool.query(
        `INSERT INTO persons 
        (nombre, apellido, documento, tipo_documento, programa, ficha, rol, estado, tipo_sangre, foto) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, apellido || null, documento, tipoDocumento, programa || null, ficha || null, rol, estado || 'ACTIVO', tipoSangre, foto || null]
      );

      const [newPerson] = await pool.query(
        'SELECT * FROM persons WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Persona creada exitosamente',
        data: newPerson[0]
      });
    } catch (error) {
      console.error('Error al crear persona:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear persona',
        error: error.message
      });
    }
  }
);

// ============================================
// POST /api/persons/bulk - Carga masiva desde Excel/CSV
// ============================================
router.post('/bulk',
  verificarToken,
  verificarAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó archivo'
        });
      }

      // Leer archivo Excel/CSV
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El archivo está vacío'
        });
      }

      const personsToInsert = [];
      const errors = [];
      const duplicates = new Set();

      // Procesar cada fila
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Mapear campos (ajustar según el formato de tu Excel)
        const documento = row['numero de documento'] || row['documento'] || row['Número de documento'];
        const nombre = row['nombre'] || row['Nombre'];
        const apellido = row['apellido'] || row['Apellido'];
        const ficha = row['ficha'] || row['Ficha'];
        const tipoDocumento = row['tipo de documento'] || row['tipo_documento'] || 'CC';
        const estado = row['estado'] || row['Estado'] || 'EN FORMACION';

        // Validar datos requeridos
        if (!documento || !nombre) {
          errors.push(`Fila ${i + 2}: Faltan datos requeridos (documento o nombre)`);
          continue;
        }

        // Detectar duplicados en el archivo
        if (duplicates.has(documento)) {
          continue; // Saltar duplicados
        }
        duplicates.add(documento);

        // Preparar persona para insertar
        personsToInsert.push({
          nombre,
          apellido: apellido || '',
          documento,
          tipoDocumento,
          programa: '',
          ficha: ficha || '',
          rol: 'ESTUDIANTE',
          estado,
          tipoSangre: 'O+' // Tipo por defecto
        });
      }

      // Insertar personas en la base de datos
      let insertedCount = 0;
      let skippedCount = 0;

      for (const person of personsToInsert) {
        try {
          // Verificar si ya existe
          const [existing] = await pool.query(
            'SELECT id FROM persons WHERE documento = ?',
            [person.documento]
          );

          if (existing.length > 0) {
            skippedCount++;
            continue;
          }

          // Insertar
          await pool.query(
            `INSERT INTO persons 
            (nombre, apellido, documento, tipo_documento, programa, ficha, rol, estado, tipo_sangre) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              person.nombre,
              person.apellido,
              person.documento,
              person.tipoDocumento,
              person.programa,
              person.ficha,
              person.rol,
              person.estado,
              person.tipoSangre
            ]
          );
          insertedCount++;
        } catch (err) {
          errors.push(`Error al insertar documento ${person.documento}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        message: 'Carga masiva completada',
        data: {
          totalProcessed: data.length,
          inserted: insertedCount,
          skipped: skippedCount,
          errors: errors.length > 0 ? errors : null
        }
      });
    } catch (error) {
      console.error('Error en carga masiva:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar archivo',
        error: error.message
      });
    }
  }
);

// ============================================
// PUT /api/persons/:id - Actualizar persona
// ============================================
router.put('/:id',
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Verificar si la persona existe
      const [existing] = await pool.query(
        'SELECT id FROM persons WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Persona no encontrada'
        });
      }

      // Construir query de actualización
      const fields = [];
      const values = [];

      const allowedFields = ['nombre', 'apellido', 'documento', 'tipo_documento', 'programa', 'ficha', 'rol', 'estado', 'tipo_sangre', 'foto'];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      values.push(id);

      await pool.query(
        `UPDATE persons SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      const [updated] = await pool.query(
        'SELECT * FROM persons WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Persona actualizada exitosamente',
        data: updated[0]
      });
    } catch (error) {
      console.error('Error al actualizar persona:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar persona',
        error: error.message
      });
    }
  }
);

// ============================================
// DELETE /api/persons/:id - Eliminar persona
// ============================================
router.delete('/:id',
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar si la persona existe
      const [existing] = await pool.query(
        'SELECT id FROM persons WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Persona no encontrada'
        });
      }

      await pool.query('DELETE FROM persons WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Persona eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar persona:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar persona',
        error: error.message
      });
    }
  }
);

export default router;
