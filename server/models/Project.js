import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    frontend: { type: Number, default: 0, min: 0, max: 100 },
    backend: { type: Number, default: 0, min: 0, max: 100 },
    database: { type: Number, default: 0, min: 0, max: 100 },
    testing: { type: Number, default: 0, min: 0, max: 100 },
    documentation: { type: Number, default: 0, min: 0, max: 100 },
    deployment: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Project name is required'], trim: true, maxlength: 120 },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'archived'],
      default: 'planning',
    },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    deadline: { type: Date },
    progress: { type: progressSchema, default: () => ({}) },
    tags: [{ type: String }],
    repoUrl: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Overall progress = average of the six tracked areas
projectSchema.virtual('overallProgress').get(function () {
  const p = this.progress || {};
  const keys = ['frontend', 'backend', 'database', 'testing', 'documentation', 'deployment'];
  return Math.round(keys.reduce((sum, k) => sum + (p[k] || 0), 0) / keys.length);
});

projectSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Project', projectSchema);
