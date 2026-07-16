import User from '../models/User.js';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import Task from '../models/Task.js';
import DailyUpdate from '../models/DailyUpdate.js';
import Activity from '../models/Activity.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/analytics/dashboard — stat cards + charts for dashboard */
export const getDashboard = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const projectFilter = isAdmin
    ? {}
    : { $or: [{ members: req.user._id }, { leader: req.user._id }] };

  const myProjects = await Project.find(projectFilter).select('_id name status progress deadline');
  const projectIds = myProjects.map((p) => p._id);
  const taskFilter = isAdmin ? {} : { project: { $in: projectIds } };

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    totalUsers, totalTeams, taskByStatus, activeMembers, upcomingDeadlines, activityByDay,
  ] = await Promise.all([
    isAdmin ? User.countDocuments() : null,
    isAdmin ? Team.countDocuments() : Team.countDocuments({ members: req.user._id }),
    Task.aggregate([
      { $match: taskFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 15 * 60 * 1000) } }),
    Task.find({ ...taskFilter, deadline: { $gte: new Date() }, status: { $ne: 'completed' } })
      .sort('deadline').limit(5).populate('project', 'name').select('title deadline priority project'),
    Activity.aggregate([
      { $match: { createdAt: { $gte: weekAgo }, ...(isAdmin ? {} : { project: { $in: projectIds } }) } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const statusCounts = Object.fromEntries(taskByStatus.map((s) => [s._id, s.count]));
  const totalTasks = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const completed = statusCounts.completed || 0;

  res.json({
    success: true,
    data: {
      cards: {
        totalProjects: myProjects.length,
        totalTeams,
        totalUsers,
        pendingTasks: totalTasks - completed,
        completedTasks: completed,
        activeMembers,
        progressPercent: totalTasks ? Math.round((completed / totalTasks) * 100) : 0,
      },
      taskByStatus: statusCounts,
      projects: myProjects,
      upcomingDeadlines,
      activityByDay,
    },
  });
});

/** GET /api/analytics/performance — team & member performance */
export const getPerformance = asyncHandler(async (req, res) => {
  const [memberPerformance, projectPerformance, avgCompletion, hoursByUser] = await Promise.all([
    // Most active members by completed tasks
    Task.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$assignees' },
      { $group: { _id: '$assignees', completedTasks: { $sum: 1 }, hours: { $sum: '$loggedHours' } } },
      { $sort: { completedTasks: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { completedTasks: 1, hours: 1, 'user.name': 1, 'user.avatar': 1 } },
    ]),
    // Project completion rates
    Task.aggregate([
      { $group: {
        _id: '$project',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      } },
      { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'project' } },
      { $unwind: '$project' },
      { $project: { total: 1, completed: 1, name: '$project.name' } },
      { $sort: { completed: -1 } },
    ]),
    // Average completion time (created → last update for completed tasks)
    Task.aggregate([
      { $match: { status: 'completed' } },
      { $project: { duration: { $subtract: ['$updatedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$duration' } } },
    ]),
    // Work hours from daily updates (last 30 days)
    DailyUpdate.aggregate([
      { $match: { date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$user', hours: { $sum: '$hoursWorked' } } },
      { $sort: { hours: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { hours: 1, 'user.name': 1, 'user.avatar': 1 } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      memberPerformance,
      projectPerformance,
      avgCompletionHours: avgCompletion[0] ? Math.round(avgCompletion[0].avgMs / 36e5) : 0,
      hoursByUser,
    },
  });
});
