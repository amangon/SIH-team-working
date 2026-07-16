import User from '../models/User.js';
import Project from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { saveFile } from '../services/storage.js';

/** GET /api/users — list users (paginated, searchable) */
export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', role } = req.query;
  const query = {};
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
  if (role) query.role = role;

  const [users, total] = await Promise.all([
    User.find(query).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
    User.countDocuments(query),
  ]);
  res.json({ success: true, data: { users, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

/** GET /api/users/:id */
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  const projects = await Project.find({ members: user._id }).select('name status');
  res.json({ success: true, data: { user, projects } });
});

/** PATCH /api/users/me — update own profile */
export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'title', 'skills', 'theme'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, data: { user } });
});

/** POST /api/users/me/avatar */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  if (!req.file.mimetype.startsWith('image/')) throw new ApiError(400, 'Avatar must be an image');
  const { url } = await saveFile(req.file);
  const user = await User.findByIdAndUpdate(req.user._id, { avatar: url }, { new: true });
  res.json({ success: true, data: { user } });
});

/** PATCH /api/users/me/password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Both passwords are required');
  if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw new ApiError(401, 'Current password is incorrect');
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed' });
});
