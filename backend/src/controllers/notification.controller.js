const db = require('../config/database');
const logger = require('../config/logger');

// ─── Notifications ────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await db('notifications')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .limit(50);
    res.json({ notifications });
  } catch (err) {
    logger.error('Get notifications error:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const id = req.params.id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }
    await db('notifications')
      .where({ id, user_id: req.user.id })
      .update({ is_read: true, updated_at: new Date() });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    logger.error('Mark read error:', err);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

// ─── Messages ─────────────────────────────────────────────

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Use parameterized bindings — no string interpolation
    const conversations = await db('messages')
      .where('sender_id', userId)
      .orWhere('receiver_id', userId)
      .groupBy(db.raw('CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END', [userId]))
      .select(
        db.raw('CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id', [userId]),
        db.raw('MAX(created_at) as last_message_at'),
        db.raw('COUNT(*) FILTER (WHERE is_read = false AND receiver_id = ?) as unread_count', [userId])
      )
      .orderBy('last_message_at', 'desc');

    // Attach user info and last message
    for (const conv of conversations) {
      conv.otherUser = await db('users')
        .where({ id: conv.other_user_id })
        .select('id', 'name', 'phone', 'avatar_url', 'role')
        .first();

      conv.lastMessage = await db('messages')
        .where(function () {
          this.where({ sender_id: userId, receiver_id: conv.other_user_id })
            .orWhere({ sender_id: conv.other_user_id, receiver_id: userId });
        })
        .orderBy('created_at', 'desc')
        .first();
    }

    res.json({ conversations });
  } catch (err) {
    logger.error('Get conversations error:', err);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.conversationId;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(otherId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const messages = await db('messages')
      .where(function () {
        this.where({ sender_id: userId, receiver_id: otherId })
          .orWhere({ sender_id: otherId, receiver_id: userId });
      })
      .orderBy('created_at', 'asc')
      .limit(100);

    // Mark incoming as read
    await db('messages')
      .where({ sender_id: otherId, receiver_id: userId, is_read: false })
      .update({ is_read: true });

    res.json({ messages });
  } catch (err) {
    logger.error('Get messages error:', err);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const receiverId = req.params.conversationId;
    const { content } = req.body;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receiverId)) {
      return res.status(400).json({ message: 'Invalid receiver ID' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content required' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ message: 'Message too long (max 2000 characters)' });
    }

    const [message] = await db('messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        content: content.trim(),
      })
      .returning('*');

    res.status(201).json({ message });
  } catch (err) {
    logger.error('Send message error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
};
