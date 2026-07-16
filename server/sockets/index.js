/**
 * Socket.IO setup — realtime chat, notifications, Kanban updates, presence.
 * Clients authenticate by passing their JWT access token in the handshake.
 */
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let io = null;
export const getIO = () => io;

export const initSockets = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  });

  // Authenticate socket connections with the same JWT as the REST API
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.id).select('name avatar role isBlocked');
      if (!user || user.isBlocked) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`); // personal room for notifications

    io.emit('presence:online', { userId, name: socket.user.name });

    // Join / leave project rooms (Kanban + group chat + activity feed)
    socket.on('project:join', (projectId) => socket.join(`project:${projectId}`));
    socket.on('project:leave', (projectId) => socket.leave(`project:${projectId}`));

    // Chat rooms — a room is a project id or "dm:<a>:<b>"
    socket.on('chat:join', (room) => {
      if (room.startsWith('dm:') && !room.includes(userId)) return; // not their DM
      socket.join(room);
    });
    socket.on('chat:leave', (room) => socket.leave(room));

    socket.on('chat:typing', ({ room }) => {
      socket.to(room).emit('chat:typing', { room, userId, name: socket.user.name });
    });

    socket.on('disconnect', () => {
      io.emit('presence:offline', { userId });
    });
  });

  console.log('✓ Socket.IO initialized');
  return io;
};
