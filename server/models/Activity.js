import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // e.g. "task.created", "file.uploaded"
    description: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

activitySchema.index({ createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
