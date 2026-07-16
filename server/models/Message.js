import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // "room" is either a project id (group chat) or "dm:<idA>:<idB>" (private chat, ids sorted)
    room: { type: String, required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ content: 'text' });

export default mongoose.model('Message', messageSchema);
