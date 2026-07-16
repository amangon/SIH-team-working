import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity, notify } from '../utils/events.js';
import { reviewCode } from '../services/aiReview.js';
import { getIO } from '../sockets/index.js';

const emitBoard = (projectId, event, payload) => {
  const io = getIO();
  if (io) io.to(`project:${projectId}`).emit(event, payload);
};

/** GET /api/tasks?project=<id> — tasks for a project (Kanban) */
export const getTasks = asyncHandler(async (req, res) => {
  const { project, status, priority, assignee, search, page = 1, limit = 200 } = req.query;
  const query = {};
  if (project) query.project = project;
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignee) query.assignees = assignee;
  if (search) query.title = { $regex: search, $options: 'i' };
  if (!project && req.user.role !== 'admin') query.assignees = req.user._id;

  const tasks = await Task.find(query)
    .populate('assignees', 'name avatar')
    .populate('createdBy', 'name')
    .sort('status order -createdAt')
    .skip((page - 1) * limit).limit(Number(limit));
  res.json({ success: true, data: { tasks } });
});

/** GET /api/tasks/:id */
export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignees', 'name avatar email')
    .populate('createdBy', 'name avatar')
    .populate('approvedBy', 'name')
    .populate('attachments')
    .populate('project', 'name leader members')
    .populate('codeVersions.uploadedBy', 'name');
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, data: { task } });
});

/** POST /api/tasks — leader/admin */
export const createTask = asyncHandler(async (req, res) => {
  const { project: projectId, title, description, priority, labels, assignees = [], deadline, estimatedHours } = req.body;
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Project not found');
  if (req.user.role === 'member') throw new ApiError(403, 'Only leaders and admins can create tasks');

  const count = await Task.countDocuments({ project: projectId, status: 'todo' });
  const task = await Task.create({
    project: projectId, title, description, priority, labels, assignees, deadline,
    estimatedHours, order: count, createdBy: req.user._id,
    history: [{ action: 'Task created', by: req.user._id }],
  });

  const populated = await Task.findById(task._id).populate('assignees', 'name avatar');
  emitBoard(projectId, 'task:created', populated);
  await logActivity({
    actor: req.user._id, action: 'task.created',
    description: `created task "${task.title}"`, project: projectId, task: task._id,
  });
  if (assignees.length) {
    await notify({
      users: assignees, type: 'task-assigned', title: 'New task assigned',
      body: `"${task.title}" in ${project.name}`, link: `/projects/${projectId}?task=${task._id}`,
    });
  }
  res.status(201).json({ success: true, data: { task: populated } });
});

/** PATCH /api/tasks/:id */
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project', 'name leader');
  if (!task) throw new ApiError(404, 'Task not found');

  const isAssignee = task.assignees.some((a) => String(a) === String(req.user._id));
  const isManager = req.user.role === 'admin' || String(task.project.leader) === String(req.user._id);
  if (!isAssignee && !isManager) throw new ApiError(403, 'Not allowed to update this task');

  // Members can update a limited set; managers can update everything
  const memberFields = ['status', 'progress', 'loggedHours', 'order'];
  const managerFields = [...memberFields, 'title', 'description', 'priority', 'labels', 'assignees', 'deadline', 'estimatedHours'];
  const allowed = isManager ? managerFields : memberFields;

  const prevStatus = task.status;
  const prevAssignees = task.assignees.map(String);
  for (const key of allowed) if (key in req.body) task[key] = req.body[key];
  if (task.status === 'completed') task.progress = 100;

  if (prevStatus !== task.status) {
    task.history.push({ action: `Status: ${prevStatus} → ${task.status}`, by: req.user._id });
  }
  await task.save();

  const populated = await Task.findById(task._id).populate('assignees', 'name avatar');
  emitBoard(task.project._id, 'task:updated', populated);

  if (prevStatus !== task.status) {
    await logActivity({
      actor: req.user._id, action: 'task.status',
      description: `moved "${task.title}" to ${task.status}`, project: task.project._id, task: task._id,
    });
    if (task.status === 'completed') {
      await notify({
        users: [task.project.leader].filter(Boolean), type: 'task-completed',
        title: 'Task completed', body: `"${task.title}" was marked completed`,
        link: `/projects/${task.project._id}?task=${task._id}`,
      });
    }
  }
  const newAssignees = task.assignees.map(String).filter((a) => !prevAssignees.includes(a));
  if (newAssignees.length) {
    await notify({
      users: newAssignees, type: 'task-assigned', title: 'New task assigned',
      body: `"${task.title}" in ${task.project.name}`, link: `/projects/${task.project._id}?task=${task._id}`,
    });
  }
  res.json({ success: true, data: { task: populated } });
});

/** POST /api/tasks/:id/approve — leader/admin approve completed work */
export const approveTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project', 'name leader');
  if (!task) throw new ApiError(404, 'Task not found');
  const isManager = req.user.role === 'admin' || String(task.project.leader) === String(req.user._id);
  if (!isManager) throw new ApiError(403, 'Only the leader or an admin can approve tasks');

  task.approvedBy = req.user._id;
  task.status = 'completed';
  task.progress = 100;
  task.history.push({ action: 'Task approved', by: req.user._id });
  await task.save();

  emitBoard(task.project._id, 'task:updated', await Task.findById(task._id).populate('assignees', 'name avatar'));
  await logActivity({
    actor: req.user._id, action: 'task.approved',
    description: `approved "${task.title}"`, project: task.project._id, task: task._id,
  });
  await notify({
    users: task.assignees, type: 'task-approved', title: 'Work approved',
    body: `"${task.title}" was approved`, link: `/projects/${task.project._id}?task=${task._id}`,
  });
  res.json({ success: true, data: { task } });
});

/** DELETE /api/tasks/:id — leader/admin */
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project', 'leader');
  if (!task) throw new ApiError(404, 'Task not found');
  const isManager = req.user.role === 'admin' || String(task.project.leader) === String(req.user._id);
  if (!isManager) throw new ApiError(403, 'Only the leader or an admin can delete tasks');

  await task.deleteOne();
  emitBoard(task.project._id, 'task:deleted', { _id: task._id });
  res.json({ success: true, message: 'Task deleted' });
});

/** POST /api/tasks/:id/code — upload a new code version */
export const uploadCode = asyncHandler(async (req, res) => {
  const { code, language = 'javascript' } = req.body;
  if (!code) throw new ApiError(400, 'Code content is required');
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  task.codeVersions.push({ code, language, uploadedBy: req.user._id });
  task.history.push({ action: `Code uploaded (${language})`, by: req.user._id });
  await task.save();

  await logActivity({
    actor: req.user._id, action: 'code.uploaded',
    description: `uploaded ${language} code to "${task.title}"`, project: task.project, task: task._id,
  });
  res.status(201).json({ success: true, data: { codeVersion: task.codeVersions.at(-1) } });
});

/** POST /api/tasks/:id/ai-review — run AI review on latest (or given) code version */
export const aiReviewTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  const version = req.body.versionId
    ? task.codeVersions.id(req.body.versionId)
    : task.codeVersions.at(-1);
  if (!version) throw new ApiError(400, 'No code uploaded to review');

  const review = await reviewCode(version.code, version.language);
  task.aiReviews.push({ review, codeVersionId: version._id });
  await task.save();

  await logActivity({
    actor: req.user._id, action: 'ai.review',
    description: `ran AI review on "${task.title}" (score: ${review.score})`,
    project: task.project, task: task._id,
  });
  res.json({ success: true, data: { review } });
});
