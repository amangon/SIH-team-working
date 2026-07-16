import mongoose from 'mongoose';

const codeVersionSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' },
    language: { type: String, default: 'javascript' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'review', 'testing', 'completed'],
      default: 'todo',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    labels: [{ type: String }],
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deadline: { type: Date },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    order: { type: Number, default: 0 },
    estimatedHours: { type: Number, default: 0 },
    loggedHours: { type: Number, default: 0 },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    codeVersions: [codeVersionSchema],
    aiReviews: [
      {
        review: mongoose.Schema.Types.Mixed,
        codeVersionId: mongoose.Schema.Types.ObjectId,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    history: [
      {
        action: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ project: 1, status: 1, order: 1 });

export default mongoose.model('Task', taskSchema);
