import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity, notify } from '../utils/events.js';

const canManageProject = (user, project) =>
  user.role === 'admin' || String(project.leader) === String(user._id);

const isProjectMember = (user, project) =>
  user.role === 'admin' ||
  String(project.leader) === String(user._id) ||
  project.members.some((m) => String(m._id || m) === String(user._id));

/** GET /api/projects — projects visible to current user */
export const getProjects = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, search = '', status, sort = '-createdAt' } = req.query;
  const query = {};
  if (req.user.role !== 'admin') {
    query.$or = [{ members: req.user._id }, { leader: req.user._id }];
  }
  if (search) query.name = { $regex: search, $options: 'i' };
  if (status) query.status = status;

  const [projects, total] = await Promise.all([
    Project.find(query)
      .populate('leader', 'name avatar')
      .populate('members', 'name avatar')
      .sort(sort).skip((page - 1) * limit).limit(Number(limit)),
    Project.countDocuments(query),
  ]);
  res.json({ success: true, data: { projects, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

/** GET /api/projects/:id */
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('leader', 'name avatar email title')
    .populate('members', 'name avatar email title')
    .populate('team', 'name');
  if (!project) throw new ApiError(404, 'Project not found');
  if (!isProjectMember(req.user, project)) throw new ApiError(403, 'You are not a member of this project');

  const taskStats = await Task.aggregate([
    { $match: { project: project._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.json({ success: true, data: { project, taskStats } });
});

/** POST /api/projects — admin or leader */
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, leader, members = [], deadline, tags = [], repoUrl } = req.body;
  const project = await Project.create({
    name, description, deadline, tags, repoUrl,
    leader: leader || req.user._id,
    members: [...new Set([...members, leader || req.user._id].map(String))],
    createdBy: req.user._id,
  });

  await logActivity({
    actor: req.user._id, action: 'project.created',
    description: `created project "${project.name}"`, project: project._id,
  });
  await notify({
    users: project.members.filter((m) => String(m) !== String(req.user._id)),
    type: 'project-updated', title: 'Added to project',
    body: `You were added to "${project.name}"`, link: `/projects/${project._id}`,
  });
  res.status(201).json({ success: true, data: { project } });
});

/** PATCH /api/projects/:id */
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (!canManageProject(req.user, project)) throw new ApiError(403, 'Only the leader or an admin can update this project');

  const allowed = ['name', 'description', 'status', 'deadline', 'tags', 'repoUrl', 'members', 'leader', 'progress'];
  for (const key of allowed) if (key in req.body) project[key] = req.body[key];
  await project.save();

  await logActivity({
    actor: req.user._id, action: 'project.updated',
    description: `updated project "${project.name}"`, project: project._id,
  });
  res.json({ success: true, data: { project } });
});

/** DELETE /api/projects/:id — admin only */
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  await Task.deleteMany({ project: project._id });
  await project.deleteOne();
  await logActivity({
    actor: req.user._id, action: 'project.deleted',
    description: `deleted project "${project.name}"`,
  });
  res.json({ success: true, message: 'Project deleted' });
});

export { isProjectMember, canManageProject };
