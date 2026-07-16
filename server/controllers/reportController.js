import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import DailyUpdate from '../models/DailyUpdate.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { streamPdfReport } from '../services/pdf.js';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

/** GET /api/reports/project/:id — PDF project report */
export const projectReport = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('leader', 'name').populate('members', 'name');
  if (!project) throw new ApiError(404, 'Project not found');

  const tasks = await Task.find({ project: project._id }).populate('assignees', 'name');
  const byStatus = {};
  tasks.forEach((t) => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });

  streamPdfReport(res, {
    title: `Project Report — ${project.name}`,
    subtitle: project.description,
    filename: `project-${project._id}.pdf`,
    sections: [
      {
        heading: 'Overview',
        rows: [
          ['Status', project.status],
          ['Leader', project.leader?.name],
          ['Members', project.members.map((m) => m.name).join(', ')],
          ['Deadline', fmtDate(project.deadline)],
          ['Overall Progress', `${project.overallProgress}%`],
        ],
      },
      {
        heading: 'Progress Breakdown',
        rows: Object.entries(project.progress?.toObject?.() || {}).map(([k, v]) => [k, `${v}%`]),
      },
      {
        heading: `Tasks (${tasks.length})`,
        rows: Object.entries(byStatus).map(([s, c]) => [s, c]),
      },
      {
        heading: 'Task List',
        list: tasks.map((t) =>
          `[${t.status}] ${t.title} — ${t.assignees.map((a) => a.name).join(', ') || 'unassigned'} (${t.priority})`
        ),
      },
    ],
  });
});

/** GET /api/reports/member/:id — PDF member report */
export const memberReport = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const [tasks, updates] = await Promise.all([
    Task.find({ assignees: user._id }).populate('project', 'name'),
    DailyUpdate.find({ user: user._id }).sort('-date').limit(14),
  ]);
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const hours = updates.reduce((s, u) => s + (u.hoursWorked || 0), 0);

  streamPdfReport(res, {
    title: `Member Report — ${user.name}`,
    subtitle: user.email,
    filename: `member-${user._id}.pdf`,
    sections: [
      {
        heading: 'Summary',
        rows: [
          ['Role', user.role],
          ['Assigned Tasks', tasks.length],
          ['Completed Tasks', completed],
          ['Completion Rate', tasks.length ? `${Math.round((completed / tasks.length) * 100)}%` : '—'],
          ['Hours (last 14 updates)', hours],
        ],
      },
      {
        heading: 'Tasks',
        list: tasks.map((t) => `[${t.status}] ${t.title} (${t.project?.name || '—'})`),
      },
      {
        heading: 'Recent Daily Updates',
        list: updates.map((u) => `${fmtDate(u.date)}: ${u.todayWork.slice(0, 100)} (${u.hoursWorked}h, ${u.completedPercent}%)`),
      },
    ],
  });
});

/** GET /api/reports/period?type=daily|weekly|monthly — PDF period report */
export const periodReport = asyncHandler(async (req, res) => {
  const type = ['daily', 'weekly', 'monthly'].includes(req.query.type) ? req.query.type : 'weekly';
  const days = type === 'daily' ? 1 : type === 'weekly' ? 7 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [newTasks, completedTasks, updates] = await Promise.all([
    Task.find({ createdAt: { $gte: since } }).populate('project', 'name'),
    Task.find({ status: 'completed', updatedAt: { $gte: since } }).populate('project', 'name'),
    DailyUpdate.find({ date: { $gte: since } }).populate('user', 'name'),
  ]);

  streamPdfReport(res, {
    title: `${type[0].toUpperCase()}${type.slice(1)} Report`,
    subtitle: `Period: ${fmtDate(since)} — ${fmtDate(new Date())}`,
    filename: `${type}-report.pdf`,
    sections: [
      {
        heading: 'Summary',
        rows: [
          ['Tasks Created', newTasks.length],
          ['Tasks Completed', completedTasks.length],
          ['Daily Updates Submitted', updates.length],
          ['Total Hours Logged', updates.reduce((s, u) => s + (u.hoursWorked || 0), 0)],
        ],
      },
      { heading: 'Completed Tasks', list: completedTasks.map((t) => `${t.title} (${t.project?.name || '—'})`) },
      { heading: 'New Tasks', list: newTasks.map((t) => `${t.title} (${t.project?.name || '—'})`) },
      { heading: 'Daily Updates', list: updates.map((u) => `${u.user?.name}: ${u.todayWork.slice(0, 90)}`) },
    ],
  });
});
