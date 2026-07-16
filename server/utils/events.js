import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';
import { getIO } from '../sockets/index.js';

/** Record an activity and broadcast it in realtime to the project room */
export const logActivity = async ({ actor, action, description, project, task, meta }) => {
  try {
    const activity = await Activity.create({ actor, action, description, project, task, meta });
    const populated = await activity.populate('actor', 'name avatar');
    const io = getIO();
    if (io) {
      io.emit('activity:new', populated);
      if (project) io.to(`project:${project}`).emit('activity:project', populated);
    }
    return activity;
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
};

/** Create notifications for users and push them over sockets */
export const notify = async ({ users, type, title, body = '', link = '' }) => {
  try {
    const ids = [...new Set(users.map(String))];
    const docs = await Notification.insertMany(
      ids.map((user) => ({ user, type, title, body, link }))
    );
    const io = getIO();
    if (io) docs.forEach((n) => io.to(`user:${n.user}`).emit('notification:new', n));
    return docs;
  } catch (err) {
    console.error('Notify failed:', err.message);
  }
};
