import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Team name is required'], trim: true, maxlength: 80 },
    description: { type: String, default: '' },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Team', teamSchema);
