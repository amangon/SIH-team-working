import crypto from 'crypto';
import validator from 'validator';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken, refreshCookieOptions,
} from '../utils/tokens.js';
import { sendOtpEmail, sendResetEmail } from '../services/email.js';

const sanitizeUser = (u) => ({
  id: u._id, name: u.name, email: u.email, role: u.role, avatar: u.avatar,
  title: u.title, skills: u.skills, theme: u.theme, isVerified: u.isVerified,
  createdAt: u.createdAt,
});

const issueTokens = async (res, user) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
  await user.save({ validateBeforeSave: false });
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  return accessToken;
};

/** POST /api/auth/signup */
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }

  if (!validator.isEmail(email)) {
    throw new ApiError(400, 'Invalid email address');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const exists = await User.findOne({ email });

  if (exists) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const otp = String(crypto.randomInt(100000, 999999));

  const user = await User.create({
    name,
    email,
    password,
    otp: crypto.createHash('sha256').update(otp).digest('hex'),
    otpExpires: Date.now() + 10 * 60 * 1000,
  });

  console.log('================================');
console.log('RESEND OTP');
console.log('Email:', email);
console.log('OTP:', otp);
console.log('================================');

  await sendOtpEmail(email, otp);

  return res.status(201).json({
    success: true,
    message: 'Account created. Check your email for the OTP verification code.',
    data: {
      email: user.email,
    },
  });
});

/** POST /api/auth/verify-otp */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, 'Email and OTP are required');

  const user = await User.findOne({ email }).select('+otp +otpExpires +refreshTokens');
  if (!user) throw new ApiError(404, 'User not found');
  if (user.isVerified) throw new ApiError(400, 'Account already verified');
  const hash = crypto.createHash('sha256').update(String(otp)).digest('hex');
  if (user.otp !== hash || user.otpExpires < Date.now()) throw new ApiError(400, 'Invalid or expired OTP');

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  const accessToken = await issueTokens(res, user);
  res.json({ success: true, data: { accessToken, user: sanitizeUser(user) } });
});

/** POST /api/auth/resend-otp */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  if (user.isVerified) throw new ApiError(400, 'Account already verified');

  const otp = String(crypto.randomInt(100000, 999999));
  user.otp = crypto.createHash('sha256').update(otp).digest('hex');
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });
  await sendOtpEmail(email, otp);
  res.json({ success: true, message: 'OTP resent' });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid email or password');
  if (user.isBlocked) throw new ApiError(403, 'Your account has been blocked. Contact an admin.');
  if (!user.isVerified) throw new ApiError(403, 'Please verify your email first');

  const accessToken = await issueTokens(res, user);
  res.json({ success: true, data: { accessToken, user: sanitizeUser(user) } });
});

/** POST /api/auth/refresh — rotate refresh token */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'No refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await User.findById(payload.id).select('+refreshTokens');
  if (!user || !user.refreshTokens?.includes(token)) throw new ApiError(401, 'Refresh token revoked');
  if (user.isBlocked) throw new ApiError(403, 'Account blocked');

  user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
  const accessToken = await issueTokens(res, user);
  res.json({ success: true, data: { accessToken, user: sanitizeUser(user) } });
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.updateOne({ _id: payload.id }, { $pull: { refreshTokens: token } });
    } catch { /* already invalid */ }
  }
  res.clearCookie('refreshToken', refreshCookieOptions());
  res.json({ success: true, message: 'Logged out' });
});

/** POST /api/auth/forgot-password */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  // Always respond success to avoid account enumeration
  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');
    user.resetToken = crypto.createHash('sha256').update(raw).digest('hex');
    user.resetTokenExpires = Date.now() + 30 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    const url = `${process.env.CLIENT_URL}/reset-password/${raw}`;
    await sendResetEmail(email, url);
  }
  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
});

/** POST /api/auth/forgot-password */
export const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always respond success to avoid account enumeration
    if (user) {
      const raw = crypto.randomBytes(32).toString("hex");

      user.resetToken = crypto
        .createHash("sha256")
        .update(raw)
        .digest("hex");

      user.resetTokenExpires = Date.now() + 30 * 60 * 1000;

      await user.save({ validateBeforeSave: false });

      const url = `${process.env.CLIENT_URL}/reset-password/${raw}`;

      console.log("📩 Sending reset email to:", email);
      console.log("🔗 Reset URL:", url);

      try {
        await sendResetEmail(email, url);
        console.log("✅ Reset email sent successfully");
      } catch (err) {
        console.error("❌ RESET EMAIL ERROR:", err);
        throw err;
      }
    }

    res.json({
      success: true,
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("❌ FORGOT PASSWORD ERROR:", err);
    throw err;
  }
});
