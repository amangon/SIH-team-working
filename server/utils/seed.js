/**
 * Seed script — creates demo users, a team, a project, tasks, and sample data.
 * Run: npm run seed   (from the server/ directory)
 *
 * Demo accounts (all password: password123):
 *   admin@teamsync.ai   → Admin
 *   leader@teamsync.ai  → Team Leader
 *   member@teamsync.ai  → Member
 *   dev2@teamsync.ai    → Member
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import DailyUpdate from '../models/DailyUpdate.js';
import Meeting from '../models/Meeting.js';

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ email: 'admin@teamsync.ai' });
  if (existing) {
    console.log('Seed data already exists. Delete the database to re-seed.');
    process.exit(0);
  }

  const [admin, leader, member, dev2] = await User.create([
    { name: 'Admin User', email: 'admin@teamsync.ai', password: 'password123', role: 'admin', isVerified: true, title: 'Platform Admin' },
    { name: 'Lena Fields', email: 'leader@teamsync.ai', password: 'password123', role: 'leader', isVerified: true, title: 'Tech Lead', skills: ['Node.js', 'Architecture'] },
    { name: 'Marcus Chen', email: 'member@teamsync.ai', password: 'password123', role: 'member', isVerified: true, title: 'Frontend Developer', skills: ['React', 'Tailwind'] },
    { name: 'Priya Sharma', email: 'dev2@teamsync.ai', password: 'password123', role: 'member', isVerified: true, title: 'Backend Developer', skills: ['Express', 'MongoDB'] },
  ]);

  const team = await Team.create({
    name: 'Core Platform Team',
    description: 'Builds and maintains the main product',
    leader: leader._id,
    members: [leader._id, member._id, dev2._id],
    createdBy: admin._id,
  });

  const project = await Project.create({
    name: 'TeamSync MVP',
    description: 'Ship the MVP of our collaboration platform: auth, kanban, chat, and reports.',
    status: 'active',
    leader: leader._id,
    members: [leader._id, member._id, dev2._id],
    team: team._id,
    deadline: new Date(Date.now() + 21 * 864e5),
    progress: { frontend: 60, backend: 75, database: 90, testing: 30, documentation: 20, deployment: 10 },
    tags: ['mvp', 'hackathon'],
    createdBy: admin._id,
  });
  team.projects = [project._id];
  await team.save();

  const sampleCode = `function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].price == null) continue;
    total += items[i].price * items[i].qty;
  }
  console.log("total", total);
  return total;
}`;

  const tasks = await Task.create([
    {
      project: project._id, title: 'Design login & signup screens', status: 'completed', priority: 'high',
      assignees: [member._id], progress: 100, labels: ['frontend', 'ui'], createdBy: leader._id,
      loggedHours: 6, history: [{ action: 'Task created', by: leader._id }],
    },
    {
      project: project._id, title: 'Build REST API for tasks', status: 'in-progress', priority: 'urgent',
      assignees: [dev2._id], progress: 70, labels: ['backend', 'api'], createdBy: leader._id,
      deadline: new Date(Date.now() + 3 * 864e5), estimatedHours: 12, loggedHours: 8,
      codeVersions: [{ code: sampleCode, language: 'javascript', uploadedBy: dev2._id }],
      history: [{ action: 'Task created', by: leader._id }, { action: 'Status: todo → in-progress', by: dev2._id }],
    },
    {
      project: project._id, title: 'Implement realtime chat', status: 'review', priority: 'high',
      assignees: [member._id, dev2._id], progress: 90, labels: ['socket.io'], createdBy: leader._id,
      deadline: new Date(Date.now() + 5 * 864e5), history: [{ action: 'Task created', by: leader._id }],
    },
    {
      project: project._id, title: 'Write E2E tests for auth flow', status: 'todo', priority: 'medium',
      assignees: [dev2._id], labels: ['testing'], createdBy: leader._id,
      deadline: new Date(Date.now() + 10 * 864e5), history: [{ action: 'Task created', by: leader._id }],
    },
    {
      project: project._id, title: 'Setup CI/CD pipeline', status: 'todo', priority: 'low',
      labels: ['devops'], createdBy: leader._id, history: [{ action: 'Task created', by: leader._id }],
    },
    {
      project: project._id, title: 'Dashboard analytics charts', status: 'testing', priority: 'medium',
      assignees: [member._id], progress: 85, labels: ['frontend', 'charts'], createdBy: leader._id,
      history: [{ action: 'Task created', by: leader._id }],
    },
  ]);

  await Activity.create([
    { actor: admin._id, action: 'project.created', description: 'created project "TeamSync MVP"', project: project._id },
    { actor: leader._id, action: 'task.created', description: 'created task "Build REST API for tasks"', project: project._id, task: tasks[1]._id },
    { actor: dev2._id, action: 'code.uploaded', description: 'uploaded javascript code to "Build REST API for tasks"', project: project._id, task: tasks[1]._id },
    { actor: member._id, action: 'task.status', description: 'moved "Design login & signup screens" to completed', project: project._id, task: tasks[0]._id },
  ]);

  await DailyUpdate.create([
    {
      user: member._id, project: project._id, todayWork: 'Finished the login and signup screens, added form validation and dark mode support.',
      tomorrowPlan: 'Start on the dashboard charts.', problems: 'None', completedPercent: 100, hoursWorked: 6,
    },
    {
      user: dev2._id, project: project._id, todayWork: 'Built task CRUD endpoints with role checks. Started on the approve flow.',
      tomorrowPlan: 'Finish approve flow + write tests.', problems: 'Mongoose populate performance on large task lists.',
      completedPercent: 70, hoursWorked: 7.5,
    },
  ]);

  await Meeting.create([
    {
      title: 'Sprint Planning', type: 'sprint', start: new Date(Date.now() + 2 * 864e5),
      project: project._id, attendees: [leader._id, member._id, dev2._id], createdBy: leader._id,
    },
    {
      title: 'Demo Day', type: 'event', start: new Date(Date.now() + 14 * 864e5),
      project: project._id, createdBy: admin._id,
    },
  ]);

  console.log(`
✓ Seed complete!

Demo accounts (password: password123):
  admin@teamsync.ai   → Admin
  leader@teamsync.ai  → Team Leader
  member@teamsync.ai  → Member
  dev2@teamsync.ai    → Member
`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
