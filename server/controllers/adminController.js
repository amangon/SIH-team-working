import mongoose from 'mongoose';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const audit = (req, action, target, meta) =>
  AuditLog.create({ actor: req.user._id, action, target, ip: req.ip, meta }).catch(() => {});

/** PATCH /api/admin/users/:id/role */
export const setRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'leader', 'member'].includes(role)) throw new ApiError(400, 'Invalid role');
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot change your own role');

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  await audit(req, 'user.role-changed', user.email, { role });
  res.json({ success: true, data: { user } });
});

/** PATCH /api/admin/users/:id/block */
export const toggleBlock = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot block yourself');
  const user = await User.findById(req.params.id).select('+refreshTokens');
  if (!user) throw new ApiError(404, 'User not found');

  user.isBlocked = !user.isBlocked;
  if (user.isBlocked) user.refreshTokens = []; // kill all sessions
  await user.save({ validateBeforeSave: false });
  await audit(req, user.isBlocked ? 'user.blocked' : 'user.unblocked', user.email);
  res.json({ success: true, data: { user } });
});

/** DELETE /api/admin/users/:id */
export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete yourself');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  await audit(req, 'user.deleted', user.email);
  res.json({ success: true, message: 'User deleted' });
});

/** GET /api/admin/audit-logs */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const [logs, total] = await Promise.all([
    AuditLog.find().populate('actor', 'name email').sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit)),
    AuditLog.countDocuments(),
  ]);
  res.json({ success: true, data: { logs, total, pages: Math.ceil(total / limit) } });
});

/** GET /api/admin/system — DB status & collection counts */
export const getSystemStatus = asyncHandler(async (_req, res) => {
  const db = mongoose.connection;
  const collections = await db.db.listCollections().toArray();
  const counts = {};
  for (const c of collections) {
    counts[c.name] = await db.db.collection(c.name).countDocuments();
  }
  res.json({
    success: true,
    data: {
      dbState: ['disconnected', 'connected', 'connecting', 'disconnecting'][db.readyState],
      dbName: db.name,
      collections: counts,
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      drivers: {
        storage: process.env.STORAGE_DRIVER || 'local',
        email: process.env.EMAIL_DRIVER || 'console',
        ai: process.env.AI_DRIVER || 'mock',
      },
    },
  });
});

/** GET /api/admin/backup — export all collections as JSON */
export const backupDatabase = asyncHandler(async (req, res) => {
  const db = mongoose.connection;
  const collections = await db.db.listCollections().toArray();
  const backup = {};
  for (const c of collections) {
    backup[c.name] = await db.db.collection(c.name).find().toArray();
  }
  await audit(req, 'system.backup');
  res.setHeader('Content-Disposition', `attachment; filename="teamsync-backup-${Date.now()}.json"`);
  res.json(backup);
});
