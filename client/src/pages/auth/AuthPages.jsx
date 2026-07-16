import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api, getErrorMessage } from '@/services/api';
import { useToast } from '@/context/ToastContext';

/** Shared glassmorphism auth shell with gradient background */
function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-600/30 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-600/30 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass w-full max-w-md p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-600/40 mb-4">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-1 text-center">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      const msg = getErrorMessage(err);
      toast(msg, 'error');
      if (msg.includes('verify')) navigate('/verify-otp', { state: { email: form.email } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your TeamSync AI workspace">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" placeholder="you@company.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" required className="input" placeholder="••••••••"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-brand-500 hover:underline">Forgot password?</Link>
        </div>
        <SubmitButton loading={loading}>Sign In</SubmitButton>
      </form>
      <p className="text-sm text-gray-400 text-center mt-6">
        No account? <Link to="/signup" className="text-brand-500 hover:underline font-medium">Sign up</Link>
      </p>
    </AuthShell>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/signup', form);
      toast('Account created! Check the server console for your OTP.');
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Start collaborating with your team">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Full name</label>
          <input required className="input" placeholder="Jane Doe"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" placeholder="you@company.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" required minLength={6} className="input" placeholder="At least 6 characters"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <SubmitButton loading={loading}>Create Account</SubmitButton>
      </form>
      <p className="text-sm text-gray-400 text-center mt-6">
        Already registered? <Link to="/login" className="text-brand-500 hover:underline font-medium">Sign in</Link>
      </p>
    </AuthShell>
  );
}

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { verifyOtp } = useAuth();
  const [email, setEmail] = useState(history.state?.usr?.email || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      toast('Email verified — welcome!');
      navigate('/');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Verify your email" subtitle="Enter the 6-digit code (check the server console when using the console email driver)">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">OTP Code</label>
          <input required maxLength={6} className="input text-center text-xl tracking-[0.5em] font-mono"
            placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
        </div>
        <SubmitButton loading={loading}>Verify</SubmitButton>
        <button type="button" className="btn-ghost w-full text-sm"
          onClick={() => api.post('/auth/resend-otp', { email }).then(() => toast('OTP resent')).catch((e) => toast(getErrorMessage(e), 'error'))}>
          Resend code
        </button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="We'll send you a reset link">
      {sent ? (
        <p className="text-sm text-center text-gray-400">
          If that email exists, a reset link has been sent. With the console email driver, check the server terminal.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <SubmitButton loading={loading}>Send Reset Link</SubmitButton>
        </form>
      )}
      <p className="text-sm text-gray-400 text-center mt-6">
        <Link to="/login" className="text-brand-500 hover:underline">Back to login</Link>
      </p>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      toast('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <input type="password" required minLength={6} className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <SubmitButton loading={loading}>Reset Password</SubmitButton>
      </form>
    </AuthShell>
  );
}
