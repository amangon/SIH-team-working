import Team from '../models/Team.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity, notify } from '../utils/events.js';

/** GET /api/teams */
export const getTeams = asyncHandler(async (req, res) => {
  const query = req.user.role === 'admin'
    ? {}
    : { $or: [{ members: req.user._id }, { leader: req.user._id }] };
  const teams = await Team.find(query)
    .populate('leader', 'name avatar')
    .populate('members', 'name avatar')
    .populate('projects', 'name status')
    .sort('-createdAt');
  res.json({ success: true, data: { teams } });
});

/** POST /api/teams — admin */
export const createTeam = asyncHandler(async (req, res) => {
  const { name, description, leader, members = [] } = req.body;
  const team = await Team.create({
    name, description, leader,
    members: [...new Set([...members, leader].filter(Boolean).map(String))],
    createdBy: req.user._id,
  });
  await logActivity({ actor: req.user._id, action: 'team.created', description: `created team "${team.name}"` });
  await notify({
    users: team.members, type: 'member-joined', title: 'Added to team',
    body: `You were added to team "${team.name}"`, link: '/teams',
  });
  res.status(201).json({ success: true, data: { team } });
});

/** PATCH /api/teams/:id — admin or team leader */
export const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new ApiError(404, 'Team not found');
  if (req.user.role !== 'admin' && String(team.leader) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the team leader or an admin can update this team');
  }
  const allowed = ['name', 'description', 'leader', 'members', 'projects'];
  for (const key of allowed) if (key in req.body) team[key] = req.body[key];
  await team.save();
  res.json({ success: true, data: { team } });
});

/** DELETE /api/teams/:id — admin */
export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findByIdAndDelete(req.params.id);
  if (!team) throw new ApiError(404, 'Team not found');
  await logActivity({ actor: req.user._id, action: 'team.deleted', description: `deleted team "${team.name}"` });
  res.json({ success: true, message: 'Team deleted' });
});
