import express from 'express';
import { pool } from '../config/database.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// ============================================
// GET /api/chat - Obtener mensajes del chat
// ============================================
router.get('/', verificarToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const [messages] = await pool.query(`
      SELECT 
        id, sender_id, sender_name, sender_role, message, timestamp, leido
      FROM chat_messages
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    // Transformar datos
    const transformedMessages = messages.map(msg => ({
      id: msg.id.toString(),
      senderId: msg.sender_id.toString(),
      senderName: msg.sender_name,
      senderRole: msg.sender_role,
      message: msg.message,
      timestamp: msg.timestamp,
      leido: msg.leido === 1
    }));

    res.json({
      success: true,
      data: transformedMessages,
      count: transformedMessages.length
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes del chat',
      error: error.message
    });
  }
});

// ============================================
// GET /api/chat/unread - Obtener mensajes no leídos
// ============================================
router.get('/unread', verificarToken, async (req, res) => {
  try {
    // Obtener mensajes no leídos que NO son del usuario actual
    const [messages] = await pool.query(`
      SELECT 
        id, sender_id, sender_name, sender_role, message, timestamp, leido
      FROM chat_messages
      WHERE leido = 0 AND sender_id != ?
      ORDER BY timestamp DESC
    `, [req.user.id]);

    const transformedMessages = messages.map(msg => ({
      id: msg.id.toString(),
      senderId: msg.sender_id.toString(),
      senderName: msg.sender_name,
      senderRole: msg.sender_role,
      message: msg.message,
      timestamp: msg.timestamp,
      leido: false
    }));

    res.json({
      success: true,
      data: transformedMessages,
      count: transformedMessages.length
    });
  } catch (error) {
    console.error('Error al obtener mensajes no leídos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes no leídos',
      error: error.message
    });
  }
});

// ============================================
// POST /api/chat - Enviar mensaje
// ============================================
router.post('/', verificarToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no puede estar vacío'
      });
    }

    // Obtener datos del usuario del token
    const [users] = await pool.query(
      'SELECT nombre, rol FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = users[0];

    // Insertar mensaje
    const [result] = await pool.query(
      'INSERT INTO chat_messages (sender_id, sender_name, sender_role, message) VALUES (?, ?, ?, ?)',
      [req.user.id, user.nombre, user.rol, message.trim()]
    );

    // Obtener el mensaje creado
    const [newMessage] = await pool.query(
      'SELECT id, sender_id, sender_name, sender_role, message, timestamp, leido FROM chat_messages WHERE id = ?',
      [result.insertId]
    );

    const msg = newMessage[0];

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado exitosamente',
      data: {
        id: msg.id.toString(),
        senderId: msg.sender_id.toString(),
        senderName: msg.sender_name,
        senderRole: msg.sender_role,
        message: msg.message,
        timestamp: msg.timestamp,
        leido: msg.leido === 1
      }
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje',
      error: error.message
    });
  }
});

// ============================================
// PUT /api/chat/mark-read - Marcar mensajes como leídos
// ============================================
router.put('/mark-read', verificarToken, async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs de mensajes inválidos'
      });
    }

    // Marcar mensajes como leídos
    const placeholders = messageIds.map(() => '?').join(',');
    await pool.query(
      `UPDATE chat_messages SET leido = 1 WHERE id IN (${placeholders})`,
      messageIds
    );

    res.json({
      success: true,
      message: 'Mensajes marcados como leídos'
    });
  } catch (error) {
    console.error('Error al marcar mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar mensajes como leídos',
      error: error.message
    });
  }
});

// ============================================
// DELETE /api/chat/:id - Eliminar mensaje
// ============================================
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el mensaje pertenece al usuario
    const [messages] = await pool.query(
      'SELECT sender_id FROM chat_messages WHERE id = ?',
      [id]
    );

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    if (messages[0].sender_id != req.user.id && req.user.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este mensaje'
      });
    }

    await pool.query('DELETE FROM chat_messages WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Mensaje eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar mensaje',
      error: error.message
    });
  }
});

export default router;
