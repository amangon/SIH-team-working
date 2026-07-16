import File from '../models/File.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { saveFile, deleteFile } from '../services/storage.js';
import { logActivity, notify } from '../utils/events.js';
import Project from '../models/Project.js';

/** GET /api/files?project=&task=&search= */
export const getFiles = asyncHandler(async (req, res) => {
  const { project, task, search, page = 1, limit = 30 } = req.query;
  const query = {};
  if (project) query.project = project;
  if (task) query.task = task;
  if (search) query.originalName = { $regex: search, $options: 'i' };

  const [files, total] = await Promise.all([
    File.find(query).populate('uploadedBy', 'name avatar').sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit)),
    File.countDocuments(query),
  ]);
  res.json({ success: true, data: { files, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

/** POST /api/files — multipart upload (field: "files") */
export const uploadFiles = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new ApiError(400, 'No files uploaded');
  const { project, task, previousVersion } = req.body;

  const docs = [];
  for (const file of req.files) {
    const stored = await saveFile(file);
    let version = 1;
    if (previousVersion) {
      const prev = await File.findById(previousVersion);
      if (prev) version = prev.version + 1;
    }
    docs.push(
      await File.create({
        originalName: file.originalname,
        storedName: stored.storedName,
        url: stored.url,
        mimeType: file.mimetype,
        size: file.size,
        driver: stored.driver,
        project: project || undefined,
        task: task || undefined,
        uploadedBy: req.user._id,
        version,
        previousVersion: previousVersion || undefined,
      })
    );
  }

  if (project) {
    await logActivity({
      actor: req.user._id, action: 'file.uploaded',
      description: `uploaded ${docs.length} file(s)`, project,
    });
    const proj = await Project.findById(project).select('members name');
    if (proj) {
      await notify({
        users: proj.members.filter((m) => String(m) !== String(req.user._id)),
        type: 'file-uploaded', title: 'File uploaded',
        body: `${req.user.name} uploaded ${docs[0].originalName}${docs.length > 1 ? ` +${docs.length - 1} more` : ''}`,
        link: `/projects/${project}`,
      });
    }
  }
  res.status(201).json({ success: true, data: { files: docs } });
});

/** DELETE /api/files/:id — uploader, leader, or admin */
export const removeFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);
  if (!file) throw new ApiError(404, 'File not found');
  const isOwner = String(file.uploadedBy) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed to delete this file');

  await deleteFile(file.storedName);
  await file.deleteOne();
  res.json({ success: true, message: 'File deleted' });
});
