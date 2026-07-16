import Comment from '../models/Comment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity, notify } from '../utils/events.js';

/** GET /api/comments?task=&project= */
export const getComments = asyncHandler(async (req, res) => {
  const { task, project } = req.query;
  const query = {};
  if (task) query.task = task;
  else if (project) query.project = project;
  else throw new ApiError(400, 'task or project query param required');

  const comments = await Comment.find(query)
    .populate('author', 'name avatar')
    .sort('createdAt');
  res.json({ success: true, data: { comments } });
});

/** POST /api/comments */
export const createComment = asyncHandler(async (req, res) => {
  const { task, project, content, mentions = [] } = req.body;
  if (!content?.trim()) throw new ApiError(400, 'Comment content is required');

  const comment = await Comment.create({
    task, project, content: content.trim(), mentions, author: req.user._id,
  });
  const populated = await comment.populate('author', 'name avatar');

  await logActivity({
    actor: req.user._id, action: 'comment.added',
    description: 'added a comment', project, task,
  });
  if (mentions.length) {
    await notify({
      users: mentions, type: 'comment', title: 'Mentioned in a comment',
      body: `${req.user.name}: ${content.slice(0, 80)}`,
      link: project ? `/projects/${project}${task ? `?task=${task}` : ''}` : '/',
    });
  }
  res.status(201).json({ success: true, data: { comment: populated } });
});

/** DELETE /api/comments/:id — author or admin */
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (String(comment.author) !== String(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to delete this comment');
  }
  await comment.deleteOne();
  res.json({ success: true });
});
