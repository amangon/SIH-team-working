import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['meeting', 'deadline', 'sprint', 'hackathon', 'event'],
      default: 'meeting',
    },
    start: { type: Date, required: true },
    end: { type: Date },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    link: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

meetingSchema.index({ start: 1 });

export default mongoose.model('Meeting', meetingSchema);
