const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken } = require('./auth');
const { v4: uuidv4 } = require('uuid');

// Middleware de autenticación
router.use(verificarToken);

// Obtener todos los mensajes
router.get('/', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const [mensajes] = await db.query(`
      SELECT 
        id,
        sender_id as senderId,
        sender_name as senderName,
        sender_role as senderRole,
        message,
        timestamp
      FROM mensajes_chat
      ORDER BY timestamp DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    // Invertir el orden para mostrar del más antiguo al más reciente
    res.json({ success: true, data: mensajes.reverse() });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: true, message: 'Error al obtener mensajes' });
  }
});

// Obtener mensajes recientes (últimos N mensajes)
router.get('/recientes/:cantidad', async (req, res) => {
  try {
    const cantidad = parseInt(req.params.cantidad) || 50;
    
    const [mensajes] = await db.query(`
      SELECT 
        id,
        sender_id as senderId,
        sender_name as senderName,
        sender_role as senderRole,
        message,
        timestamp
      FROM mensajes_chat
      ORDER BY timestamp DESC
      LIMIT ?
    `, [cantidad]);
    
    res.json({ success: true, data: mensajes.reverse() });
  } catch (error) {
    console.error('Error al obtener mensajes recientes:', error);
    res.status(500).json({ error: true, message: 'Error al obtener mensajes recientes' });
  }
});

// Enviar nuevo mensaje
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: true, message: 'El mensaje no puede estar vacío' });
    }
    
    if (message.length > 1000) {
      return res.status(400).json({ error: true, message: 'El mensaje es demasiado largo (máximo 1000 caracteres)' });
    }
    
    const id = uuidv4();
    
    await db.query(`
      INSERT INTO mensajes_chat (id, sender_id, sender_name, sender_role, message)
      VALUES (?, ?, ?, ?, ?)
    `, [id, req.usuario.id, req.usuario.nombre || req.usuario.usuario, req.usuario.rol, message.trim()]);
    
    const [nuevoMensaje] = await db.query(`
      SELECT 
        id,
        sender_id as senderId,
        sender_name as senderName,
        sender_role as senderRole,
        message,
        timestamp
      FROM mensajes_chat
      WHERE id = ?
    `, [id]);
    
    res.status(201).json({ success: true, data: nuevoMensaje[0] });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: true, message: 'Error al enviar mensaje' });
  }
});

// Eliminar mensaje (solo el remitente o administrador)
router.delete('/:id', async (req, res) => {
  try {
    // Obtener el mensaje
    const [mensajes] = await db.query('SELECT sender_id FROM mensajes_chat WHERE id = ?', [req.params.id]);
    
    if (mensajes.length === 0) {
      return res.status(404).json({ error: true, message: 'Mensaje no encontrado' });
    }
    
    // Verificar permisos (solo el remitente o administrador puede eliminar)
    if (mensajes[0].sender_id !== req.usuario.id && req.usuario.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para eliminar este mensaje' });
    }
    
    await db.query('DELETE FROM mensajes_chat WHERE id = ?', [req.params.id]);
    
    res.json({ success: true, message: 'Mensaje eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json({ error: true, message: 'Error al eliminar mensaje' });
  }
});

// Limpiar mensajes antiguos (solo administrador)
router.delete('/limpiar/antiguos', async (req, res) => {
  try {
    if (req.usuario.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: true, message: 'Solo administradores pueden limpiar mensajes antiguos' });
    }
    
    const { dias = 30 } = req.query;
    
    const [resultado] = await db.query(`
      DELETE FROM mensajes_chat 
      WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [parseInt(dias)]);
    
    res.json({ 
      success: true, 
      message: `${resultado.affectedRows} mensajes eliminados`,
      eliminados: resultado.affectedRows
    });
  } catch (error) {
    console.error('Error al limpiar mensajes antiguos:', error);
    res.status(500).json({ error: true, message: 'Error al limpiar mensajes antiguos' });
  }
});

module.exports = router;


