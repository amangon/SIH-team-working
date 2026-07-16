import mongoose from 'mongoose';

const dailyUpdateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    date: { type: Date, default: Date.now },
    todayWork: { type: String, required: [true, "Today's work is required"] },
    tomorrowPlan: { type: String, default: '' },
    problems: { type: String, default: '' },
    completedPercent: { type: Number, default: 0, min: 0, max: 100 },
    hoursWorked: { type: Number, default: 0, min: 0, max: 24 },
    screenshots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true }
);

dailyUpdateSchema.index({ user: 1, date: -1 });

export default mongoose.model('DailyUpdate', dailyUpdateSchema);
