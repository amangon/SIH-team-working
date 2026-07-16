import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/notifications */
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unread } = req.query;
  const query = { user: req.user._id };
  if (unread === 'true') query.read = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, data: { notifications, total, unreadCount, page: Number(page) } });
});

/** PATCH /api/notifications/read — mark all (or one via ?id=) read */
export const markNotificationsRead = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.id) filter._id = req.query.id;
  await Notification.updateMany(filter, { read: true });
  res.json({ success: true });
});
