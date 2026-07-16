import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

/** Verify access token from Authorization header and attach req.user */
export const protect = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Not authenticated');

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.id);
    if (!user) throw new ApiError(401, 'User no longer exists');
    if (user.isBlocked) throw new ApiError(403, 'Your account has been blocked');

    req.user = user;
    // Fire-and-forget activity heartbeat (throttled to once per minute)
    if (Date.now() - new Date(user.lastActive).getTime() > 60_000) {
      User.updateOne({ _id: user._id }, { lastActive: new Date() }).catch(() => {});
    }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new ApiError(401, 'Access token expired'));
    if (err.name === 'JsonWebTokenError') return next(new ApiError(401, 'Invalid token'));
    next(err);
  }
};

/** Restrict route to given roles, e.g. authorize('admin', 'leader') */
export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action'));
  }
  next();
};
