const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken } = require('./auth');

// Middleware de autenticación para todas las rutas
router.use(verificarToken);

// Obtener todas las personas
router.get('/', async (req, res) => {
  try {
    const { rol, estado, buscar } = req.query;
    let query = `
      SELECT 
        p.id_persona,
        p.tipo_documento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr,
        p.programa,
        p.ficha,
        p.zona,
        p.foto,
        p.estado,
        p.fecha_generacion,
        p.fecha_expiracion,
        p.id_usuario,
        ep.nombre_estado,
        rp.nombre_rol_persona
      FROM personas p
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE 1=1
    `;
    const params = [];
    
    if (rol && rol !== 'TODOS') {
      query += ' AND rp.nombre_rol_persona = ?';
      params.push(rol);
    }
    
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
    
    const [personas] = await db.query(query, params);
    
    // Mapear resultados para compatibilidad
    const personasMapeadas = personas.map(p => ({
      id: p.id_persona,
      tipoDocumento: p.tipo_documento,
      documento: p.documento,
      nombres: p.nombres,
      apellidos: p.apellidos,
      nombre: p.nombres, // Compatibilidad
      apellido: p.apellidos, // Compatibilidad
      codigoQR: p.codigo_qr,
      programa: p.programa,
      ficha: p.ficha,
      zona: p.zona,
      foto: p.foto,
      estado: p.estado,
      fechaGeneracion: p.fecha_generacion,
      fechaExpiracion: p.fecha_expiracion,
      idUsuario: p.id_usuario,
      estadoPersona: p.nombre_estado,
      rolPersona: p.nombre_rol_persona,
      rol: p.nombre_rol_persona // Compatibilidad
    }));
    
    res.json({ success: true, data: personasMapeadas });
  } catch (error) {
    console.error('Error al obtener personas:', error);
    res.status(500).json({ error: true, message: 'Error al obtener personas' });
  }
});

// Obtener persona por ID
router.get('/:id', async (req, res) => {
  try {
    const [personas] = await db.query(`
      SELECT 
        p.id_persona,
        p.tipo_documento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr,
        p.programa,
        p.ficha,
        p.zona,
        p.foto,
        p.estado,
        p.fecha_generacion,
        p.fecha_expiracion,
        p.id_usuario,
        p.id_estado_persona,
        p.id_rol_persona,
        ep.nombre_estado,
        rp.nombre_rol_persona
      FROM personas p
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ?
    `, [req.params.id]);
    
    if (personas.length === 0) {
      return res.status(404).json({ error: true, message: 'Persona no encontrada' });
    }
    
    const p = personas[0];
    res.json({ 
      success: true, 
      data: {
        id: p.id_persona,
        tipoDocumento: p.tipo_documento,
        documento: p.documento,
        nombres: p.nombres,
        apellidos: p.apellidos,
        nombre: p.nombres,
        apellido: p.apellidos,
        codigoQR: p.codigo_qr,
        programa: p.programa,
        ficha: p.ficha,
        zona: p.zona,
        foto: p.foto,
        estado: p.estado,
        fechaGeneracion: p.fecha_generacion,
        fechaExpiracion: p.fecha_expiracion,
        idUsuario: p.id_usuario,
        idEstadoPersona: p.id_estado_persona,
        idRolPersona: p.id_rol_persona,
        estadoPersona: p.nombre_estado,
        rolPersona: p.nombre_rol_persona,
        rol: p.nombre_rol_persona
      }
    });
  } catch (error) {
    console.error('Error al obtener persona:', error);
    res.status(500).json({ error: true, message: 'Error al obtener persona' });
  }
});

// Buscar persona por documento
router.get('/documento/:documento', async (req, res) => {
  try {
    const [personas] = await db.query(`
      SELECT 
        p.id_persona,
        p.tipo_documento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr,
        p.programa,
        p.ficha,
        p.zona,
        p.foto,
        p.estado,
        ep.nombre_estado,
        rp.nombre_rol_persona
      FROM personas p
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.documento = ?
    `, [req.params.documento]);
    
    if (personas.length === 0) {
      return res.status(404).json({ error: true, message: 'Persona no encontrada' });
    }
    
    const p = personas[0];
    res.json({ 
      success: true, 
      data: {
        id: p.id_persona,
        tipoDocumento: p.tipo_documento,
        documento: p.documento,
        nombres: p.nombres,
        apellidos: p.apellidos,
        nombre: p.nombres,
        apellido: p.apellidos,
        codigoQR: p.codigo_qr,
        programa: p.programa,
        ficha: p.ficha,
        zona: p.zona,
        foto: p.foto,
        estado: p.estado,
        estadoPersona: p.nombre_estado,
        rolPersona: p.nombre_rol_persona,
        rol: p.nombre_rol_persona
      }
    });
  } catch (error) {
    console.error('Error al buscar persona:', error);
    res.status(500).json({ error: true, message: 'Error al buscar persona' });
  }
});

// Crear nueva persona
router.post('/', async (req, res) => {
  try {
    const {
      nombres,
      apellidos,
      documento,
      tipoDocumento,
      programa,
      ficha,
      idEstadoPersona,
      idRolPersona,
      estado,
      codigoQR
    } = req.body;
    
    // Validaciones
    if (!nombres || !documento || !tipoDocumento || !idRolPersona) {
      return res.status(400).json({ 
        error: true, 
        message: 'Campos requeridos: nombres, documento, tipoDocumento, idRolPersona' 
      });
    }
    
    // Verificar si el documento ya existe
    const [existente] = await db.query('SELECT id_persona FROM personas WHERE documento = ?', [documento]);
    if (existente.length > 0) {
      return res.status(400).json({ error: true, message: 'El documento ya está registrado' });
    }
    
    // Verificar que el rol existe
    const [rolExiste] = await db.query('SELECT id_rol_persona FROM roles_personas WHERE id_rol_persona = ?', [idRolPersona]);
    if (rolExiste.length === 0) {
      return res.status(400).json({ error: true, message: 'El rol de persona no existe' });
    }
    
    // Verificar que el estado existe si se proporciona
    if (idEstadoPersona) {
      const [estadoExiste] = await db.query('SELECT id_estado_persona FROM estados_personas WHERE id_estado_persona = ?', [idEstadoPersona]);
      if (estadoExiste.length === 0) {
        return res.status(400).json({ error: true, message: 'El estado de persona no existe' });
      }
    }
    
    // Generar código QR si no se proporciona
    const codigoQRFinal = codigoQR || `PERSONA_${documento}_${Date.now()}`;
    
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
        programa, ficha, zona, foto, estado, id_usuario, id_estado_persona, id_rol_persona
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tipoDocumento, documento, nombres, apellidos || null, codigoQRFinal,
        programa || null, ficha || null, zona || null, foto || null, estado || 'ACTIVO', idUsuarioFinal,
        idEstadoPersona || null, idRolPersona
      ]
    );
    
    const [nuevaPersona] = await db.query(`
      SELECT 
        p.id_persona,
        p.tipo_documento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr,
        p.programa,
        p.ficha,
        p.zona,
        p.foto,
        p.estado,
        ep.nombre_estado,
        rp.nombre_rol_persona
      FROM personas p
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.documento = ?
    `, [documento]);
    
    const p = nuevaPersona[0];
    res.status(201).json({ 
      success: true, 
      data: {
        id: p.id_persona,
        tipoDocumento: p.tipo_documento,
        documento: p.documento,
        nombres: p.nombres,
        apellidos: p.apellidos,
        nombre: p.nombres,
        apellido: p.apellidos,
        codigoQR: p.codigo_qr,
        programa: p.programa,
        ficha: p.ficha,
        zona: p.zona,
        foto: p.foto,
        estado: p.estado,
        estadoPersona: p.nombre_estado,
        rolPersona: p.nombre_rol_persona,
        rol: p.nombre_rol_persona
      }
    });
  } catch (error) {
    console.error('Error al crear persona:', error);
    res.status(500).json({ error: true, message: 'Error al crear persona' });
  }
});

// Actualizar persona
router.put('/:id', async (req, res) => {
  try {
    const {
      nombres,
      apellidos,
      documento,
      tipoDocumento,
      programa,
      ficha,
      zona,
      foto,
      idEstadoPersona,
      idRolPersona,
      estado,
      codigoQR
    } = req.body;
    
    // Verificar si la persona existe
    const [personaExiste] = await db.query('SELECT id_persona FROM personas WHERE id_persona = ?', [req.params.id]);
    if (personaExiste.length === 0) {
      return res.status(404).json({ error: true, message: 'Persona no encontrada' });
    }
    
    // Si se está actualizando el documento, verificar que no exista en otra persona
    if (documento) {
      const [docExiste] = await db.query(
        'SELECT id_persona FROM personas WHERE documento = ? AND id_persona != ?',
        [documento, req.params.id]
      );
      if (docExiste.length > 0) {
        return res.status(400).json({ error: true, message: 'El documento ya está registrado en otra persona' });
      }
    }
    
    // Verificar que el rol existe si se proporciona
    if (idRolPersona) {
      const [rolExiste] = await db.query('SELECT id_rol_persona FROM roles_personas WHERE id_rol_persona = ?', [idRolPersona]);
      if (rolExiste.length === 0) {
        return res.status(400).json({ error: true, message: 'El rol de persona no existe' });
      }
    }
    
    // Verificar que el estado existe si se proporciona
    if (idEstadoPersona) {
      const [estadoExiste] = await db.query('SELECT id_estado_persona FROM estados_personas WHERE id_estado_persona = ?', [idEstadoPersona]);
      if (estadoExiste.length === 0) {
        return res.status(400).json({ error: true, message: 'El estado de persona no existe' });
      }
    }
    
    await db.query(
      `UPDATE personas SET 
        tipo_documento = COALESCE(?, tipo_documento),
        documento = COALESCE(?, documento),
        nombres = COALESCE(?, nombres),
        apellidos = COALESCE(?, apellidos),
        codigo_qr = COALESCE(?, codigo_qr),
        programa = COALESCE(?, programa),
        ficha = COALESCE(?, ficha),
        zona = COALESCE(?, zona),
        foto = COALESCE(?, foto),
        estado = COALESCE(?, estado),
        id_estado_persona = COALESCE(?, id_estado_persona),
        id_rol_persona = COALESCE(?, id_rol_persona)
      WHERE id_persona = ?`,
      [tipoDocumento, documento, nombres, apellidos, codigoQR, programa, ficha, zona, foto, estado, idEstadoPersona, idRolPersona, req.params.id]
    );
    
    const [personaActualizada] = await db.query(`
      SELECT 
        p.id_persona,
        p.tipo_documento,
        p.documento,
        p.nombres,
        p.apellidos,
        p.codigo_qr,
        p.programa,
        p.ficha,
        p.zona,
        p.foto,
        p.estado,
        ep.nombre_estado,
        rp.nombre_rol_persona
      FROM personas p
      LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
      LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
      WHERE p.id_persona = ?
    `, [req.params.id]);
    
    const p = personaActualizada[0];
    res.json({ 
      success: true, 
      data: {
        id: p.id_persona,
        tipoDocumento: p.tipo_documento,
        documento: p.documento,
        nombres: p.nombres,
        apellidos: p.apellidos,
        nombre: p.nombres,
        apellido: p.apellidos,
        codigoQR: p.codigo_qr,
        programa: p.programa,
        ficha: p.ficha,
        zona: p.zona,
        foto: p.foto,
        estado: p.estado,
        estadoPersona: p.nombre_estado,
        rolPersona: p.nombre_rol_persona,
        rol: p.nombre_rol_persona
      }
    });
  } catch (error) {
    console.error('Error al actualizar persona:', error);
    res.status(500).json({ error: true, message: 'Error al actualizar persona' });
  }
});

// Eliminar persona
router.delete('/:id', async (req, res) => {
  try {
    // Solo administradores pueden eliminar
    if (req.usuario.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para eliminar personas' });
    }
    
    const [resultado] = await db.query('DELETE FROM personas WHERE id_persona = ?', [req.params.id]);
    
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: true, message: 'Persona no encontrada' });
    }
    
    res.json({ success: true, message: 'Persona eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar persona:', error);
    res.status(500).json({ error: true, message: 'Error al eliminar persona' });
  }
});

module.exports = router;
