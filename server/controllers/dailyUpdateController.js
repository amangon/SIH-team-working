import DailyUpdate from '../models/DailyUpdate.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity } from '../utils/events.js';

/** GET /api/daily-updates — own updates; admins/leaders see all (filterable) */
export const getDailyUpdates = asyncHandler(async (req, res) => {
  const { user, project, from, to, page = 1, limit = 20 } = req.query;
  const query = {};
  if (req.user.role === 'member') query.user = req.user._id;
  else if (user) query.user = user;
  if (project) query.project = project;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  const [updates, total] = await Promise.all([
    DailyUpdate.find(query)
      .populate('user', 'name avatar')
      .populate('project', 'name')
      .populate('screenshots')
      .sort('-date').skip((page - 1) * limit).limit(Number(limit)),
    DailyUpdate.countDocuments(query),
  ]);
  res.json({ success: true, data: { updates, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

/** POST /api/daily-updates */
export const createDailyUpdate = asyncHandler(async (req, res) => {
  const { project, todayWork, tomorrowPlan, problems, completedPercent, hoursWorked, screenshots } = req.body;
  const update = await DailyUpdate.create({
    user: req.user._id, project, todayWork, tomorrowPlan, problems,
    completedPercent, hoursWorked, screenshots,
  });
  await logActivity({
    actor: req.user._id, action: 'daily.submitted',
    description: 'submitted a daily work update', project,
  });
  res.status(201).json({ success: true, data: { update } });
});

/** PATCH /api/daily-updates/:id/review — leader/admin adds a review note */
export const reviewDailyUpdate = asyncHandler(async (req, res) => {
  if (req.user.role === 'member') throw new ApiError(403, 'Only leaders and admins can review updates');
  const update = await DailyUpdate.findByIdAndUpdate(
    req.params.id,
    { reviewedBy: req.user._id, reviewNote: req.body.reviewNote || '' },
    { new: true }
  );
  if (!update) throw new ApiError(404, 'Update not found');
  res.json({ success: true, data: { update } });
});
