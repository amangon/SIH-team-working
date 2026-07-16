import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, KeyRound, Save } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Avatar } from '@/components/ui/Avatar';

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const avatarInput = useRef(null);
  const [profile, setProfile] = useState({
    name: user?.name || '', title: user?.title || '', skills: (user?.skills || []).join(', '),
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/users/me', {
      name: profile.name,
      title: profile.title,
      skills: profile.skills.split(',').map((s) => s.trim()).filter(Boolean),
    }),
    onSuccess: ({ data }) => { setUser((u) => ({ ...u, ...data.data.user })); toast('Profile saved'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const uploadAvatar = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.post('/users/me/avatar', fd);
    },
    onSuccess: ({ data }) => { setUser((u) => ({ ...u, avatar: data.data.user.avatar })); toast('Avatar updated'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const changePassword = useMutation({
    mutationFn: () => api.patch('/users/me/password', pw),
    onSuccess: () => { setPw({ currentPassword: '', newPassword: '' }); toast('Password changed'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card space-y-5">
        <h2 className="font-semibold">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar user={user} size="lg" />
            <button
              onClick={() => avatarInput.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg hover:bg-brand-500 transition"
            >
              <Camera size={13} />
            </button>
            <input ref={avatarInput} type="file" accept="image/*" hidden
              onChange={(e) => e.target.files[0] && uploadAvatar.mutate(e.target.files[0])} />
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-gray-400">{user?.email} · <span className="capitalize">{user?.role}</span></p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Job title</label>
            <input className="input" placeholder="e.g. Frontend Developer" value={profile.title}
              onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Skills (comma separated)</label>
          <input className="input" placeholder="React, Node.js, MongoDB" value={profile.skills}
            onChange={(e) => setProfile({ ...profile, skills: e.target.value })} />
        </div>
        <button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} className="btn-primary">
          <Save size={15} /> Save Profile
        </button>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><KeyRound size={16} /> Change Password</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Current password</label>
            <input type="password" className="input" value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">New password</label>
            <input type="password" className="input" value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </div>
        </div>
        <button
          onClick={() => changePassword.mutate()}
          disabled={!pw.currentPassword || pw.newPassword.length < 6 || changePassword.isPending}
          className="btn-primary"
        >
          Update Password
        </button>
      </div>
    </div>
  );
}
