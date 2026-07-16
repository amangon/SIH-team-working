import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

import * as users from '../controllers/userController.js';
import * as projects from '../controllers/projectController.js';
import * as tasks from '../controllers/taskController.js';
import * as teams from '../controllers/teamController.js';
import * as files from '../controllers/fileController.js';
import * as chat from '../controllers/chatController.js';
import * as notifications from '../controllers/notificationController.js';
import * as daily from '../controllers/dailyUpdateController.js';
import * as comments from '../controllers/commentController.js';
import * as analytics from '../controllers/analyticsController.js';
import * as reports from '../controllers/reportController.js';
import * as misc from '../controllers/miscController.js';
import * as admin from '../controllers/adminController.js';

const router = Router();
router.use(protect); // everything below requires authentication

/* ── Users ── */
router.get('/users', users.getUsers);
router.patch('/users/me', users.updateMe);
router.post('/users/me/avatar', upload.single('avatar'), users.uploadAvatar);
router.patch('/users/me/password', users.changePassword);
router.get('/users/:id', users.getUser);

/* ── Projects ── */
router.get('/projects', projects.getProjects);
router.post('/projects', authorize('admin', 'leader'), projects.createProject);
router.get('/projects/:id', projects.getProject);
router.patch('/projects/:id', projects.updateProject);
router.delete('/projects/:id', authorize('admin'), projects.deleteProject);

/* ── Tasks ── */
router.get('/tasks', tasks.getTasks);
router.post('/tasks', tasks.createTask);
router.get('/tasks/:id', tasks.getTask);
router.patch('/tasks/:id', tasks.updateTask);
router.delete('/tasks/:id', tasks.deleteTask);
router.post('/tasks/:id/approve', tasks.approveTask);
router.post('/tasks/:id/code', tasks.uploadCode);
router.post('/tasks/:id/ai-review', tasks.aiReviewTask);

/* ── Teams ── */
router.get('/teams', teams.getTeams);
router.post('/teams', authorize('admin'), teams.createTeam);
router.patch('/teams/:id', teams.updateTeam);
router.delete('/teams/:id', authorize('admin'), teams.deleteTeam);

/* ── Files ── */
router.get('/files', files.getFiles);
router.post('/files', upload.array('files', 10), files.uploadFiles);
router.delete('/files/:id', files.removeFile);

/* ── Chat ── */
router.get('/chat/:room/messages', chat.getMessages);
router.post('/chat/:room/messages', chat.sendMessage);
router.post('/chat/:room/read', chat.markRead);

/* ── Notifications ── */
router.get('/notifications', notifications.getNotifications);
router.patch('/notifications/read', notifications.markNotificationsRead);

/* ── Daily updates ── */
router.get('/daily-updates', daily.getDailyUpdates);
router.post('/daily-updates', daily.createDailyUpdate);
router.patch('/daily-updates/:id/review', daily.reviewDailyUpdate);

/* ── Comments ── */
router.get('/comments', comments.getComments);
router.post('/comments', comments.createComment);
router.delete('/comments/:id', comments.deleteComment);

/* ── Analytics ── */
router.get('/analytics/dashboard', analytics.getDashboard);
router.get('/analytics/performance', analytics.getPerformance);

/* ── Reports (PDF) ── */
router.get('/reports/project/:id', reports.projectReport);
router.get('/reports/member/:id', authorize('admin', 'leader'), reports.memberReport);
router.get('/reports/period', authorize('admin', 'leader'), reports.periodReport);

/* ── Activity, calendar, search ── */
router.get('/activities', misc.getActivities);
router.get('/meetings', misc.getCalendar);
router.post('/meetings', authorize('admin', 'leader'), misc.createMeeting);
router.delete('/meetings/:id', authorize('admin', 'leader'), misc.deleteMeeting);
router.get('/search', misc.globalSearch);

/* ── Admin ── */
router.patch('/admin/users/:id/role', authorize('admin'), admin.setRole);
router.patch('/admin/users/:id/block', authorize('admin'), admin.toggleBlock);
router.delete('/admin/users/:id', authorize('admin'), admin.deleteUser);
router.get('/admin/audit-logs', authorize('admin'), admin.getAuditLogs);
router.get('/admin/system', authorize('admin'), admin.getSystemStatus);
router.get('/admin/backup', authorize('admin'), admin.backupDatabase);

export default router;
