import Activity from '../models/Activity.js';
import Meeting from '../models/Meeting.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import File from '../models/File.js';
import Message from '../models/Message.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/activities?project=&page= */
export const getActivities = asyncHandler(async (req, res) => {
  const { project, page = 1, limit = 30 } = req.query;
  const query = project ? { project } : {};
  const activities = await Activity.find(query)
    .populate('actor', 'name avatar')
    .sort('-createdAt').skip((page - 1) * limit).limit(Number(limit));
  res.json({ success: true, data: { activities } });
});

/** GET /api/meetings?from=&to= — calendar events (meetings + project/task deadlines) */
export const getCalendar = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 864e5);
  const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 60 * 864e5);

  const memberFilter = req.user.role === 'admin'
    ? {}
    : { $or: [{ members: req.user._id }, { leader: req.user._id }] };
  const myProjects = await Project.find(memberFilter).select('_id name deadline');
  const projectIds = myProjects.map((p) => p._id);

  const [meetings, tasks] = await Promise.all([
    Meeting.find({ start: { $gte: from, $lte: to } })
      .populate('project', 'name').populate('createdBy', 'name'),
    Task.find({
      project: { $in: projectIds },
      deadline: { $gte: from, $lte: to },
    }).select('title deadline priority project').populate('project', 'name'),
  ]);

  const events = [
    ...meetings.map((m) => ({
      id: m._id, title: m.title, type: m.type, start: m.start, end: m.end,
      project: m.project?.name, link: m.link,
    })),
    ...tasks.map((t) => ({
      id: t._id, title: `Deadline: ${t.title}`, type: 'deadline', start: t.deadline,
      project: t.project?.name, priority: t.priority,
    })),
    ...myProjects.filter((p) => p.deadline && p.deadline >= from && p.deadline <= to).map((p) => ({
      id: p._id, title: `Project due: ${p.name}`, type: 'deadline', start: p.deadline,
    })),
  ];
  res.json({ success: true, data: { events } });
});

/** POST /api/meetings */
export const createMeeting = asyncHandler(async (req, res) => {
  const { title, description, type, start, end, project, attendees, link } = req.body;
  const meeting = await Meeting.create({
    title, description, type, start, end, project, attendees, link, createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { meeting } });
});

/** DELETE /api/meetings/:id */
export const deleteMeeting = asyncHandler(async (req, res) => {
  await Meeting.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/** GET /api/search?q= — global search across collections */
export const globalSearch = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ success: true, data: { projects: [], tasks: [], users: [], files: [], messages: [] } });
  const rx = { $regex: q, $options: 'i' };

  const [projects, tasks, users, files, messages] = await Promise.all([
    Project.find({ name: rx }).select('name status').limit(5),
    Task.find({ title: rx }).select('title status project').populate('project', 'name').limit(8),
    User.find({ $or: [{ name: rx }, { email: rx }] }).select('name email avatar role').limit(5),
    File.find({ originalName: rx }).select('originalName url project').limit(5),
    Message.find({ content: rx, deleted: false }).select('content room sender createdAt')
      .populate('sender', 'name').limit(5),
  ]);
  res.json({ success: true, data: { projects, tasks, users, files, messages } });
});
