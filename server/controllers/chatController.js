import Message from '../models/Message.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from '../utils/events.js';
import { getIO } from '../sockets/index.js';

/** Build a canonical DM room id from two user ids */
export const dmRoom = (a, b) => `dm:${[String(a), String(b)].sort().join(':')}`;

/** GET /api/chat/:room/messages */
export const getMessages = asyncHandler(async (req, res) => {
  const { room } = req.params;
  const { before, limit = 50 } = req.query;

  // DM rooms: ensure requester is one of the two participants
  if (room.startsWith('dm:') && !room.includes(String(req.user._id))) {
    throw new ApiError(403, 'Not your conversation');
  }

  const query = { room, deleted: false };
  if (before) query.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(query)
    .populate('sender', 'name avatar')
    .populate({ path: 'replyTo', populate: { path: 'sender', select: 'name' } })
    .populate('attachments')
    .sort('-createdAt').limit(Number(limit));
  res.json({ success: true, data: { messages: messages.reverse() } });
});

/** POST /api/chat/:room/messages */
export const sendMessage = asyncHandler(async (req, res) => {
  const { room } = req.params;
  const { content = '', attachments = [], replyTo, mentions = [] } = req.body;
  if (!content.trim() && !attachments.length) throw new ApiError(400, 'Message cannot be empty');
  if (room.startsWith('dm:') && !room.includes(String(req.user._id))) {
    throw new ApiError(403, 'Not your conversation');
  }

  const message = await Message.create({
    room, sender: req.user._id, content: content.trim(), attachments, replyTo, mentions,
    readBy: [req.user._id],
  });
  const populated = await Message.findById(message._id)
    .populate('sender', 'name avatar')
    .populate({ path: 'replyTo', populate: { path: 'sender', select: 'name' } })
    .populate('attachments');

  const io = getIO();
  if (io) io.to(room).emit('chat:message', populated);

  if (mentions.length) {
    await notify({
      users: mentions, type: 'mention', title: 'You were mentioned',
      body: `${req.user.name}: ${content.slice(0, 80)}`,
      link: room.startsWith('dm:') ? '/chat' : `/projects/${room}`,
    });
  }
  res.status(201).json({ success: true, data: { message: populated } });
});

/** POST /api/chat/:room/read — mark all messages in room read */
export const markRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { room: req.params.room, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );
  const io = getIO();
  if (io) io.to(req.params.room).emit('chat:read', { room: req.params.room, user: req.user._id });
  res.json({ success: true });
});
