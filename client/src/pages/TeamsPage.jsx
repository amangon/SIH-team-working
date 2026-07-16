import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Trash2, Crown } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
import { Skeleton, EmptyState } from '@/components/ui';

function CreateTeamModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', description: '', leader: '', members: [] });

  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => api.get('/users', { params: { limit: 100 } }).then((r) => r.data.data),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => api.post('/teams', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast('Team created');
      onClose();
      setForm({ name: '', description: '', leader: '', members: [] });
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const toggleMember = (id) =>
    setForm((f) => ({
      ...f,
      members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id],
    }));

  return (
    <Modal open={open} onClose={onClose} title="New Team">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
        <div>
          <label className="label">Team name</label>
          <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-16" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Team Leader</label>
          <select required className="input" value={form.leader} onChange={(e) => setForm({ ...form, leader: e.target.value })}>
            <option value="">Select a leader…</option>
            {usersData?.users?.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Members</label>
          <div className="max-h-44 overflow-y-auto space-y-1 border border-gray-200 dark:border-white/10 rounded-xl p-2">
            {usersData?.users?.map((u) => (
              <label key={u._id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-sm">
                <input type="checkbox" className="accent-indigo-600"
                  checked={form.members.includes(u._id)} onChange={() => toggleMember(u._id)} />
                {u.name} <span className="text-xs text-gray-400">({u.role})</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={create.isPending} className="btn-primary w-full">Create Team</button>
      </form>
    </Modal>
  );
}

export function TeamsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const isAdmin = user?.role === 'admin';

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then((r) => r.data.data.teams),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/teams/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); toast('Team deleted'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">Teams</h1>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary ml-auto"><Plus size={15} /> New Team</button>
        )}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : teams?.length ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((t) => (
            <div key={t._id} className="card group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center">
                  <Users size={18} className="text-purple-500" />
                </div>
                {isAdmin && (
                  <button onClick={() => { if (confirm(`Delete team "${t.name}"?`)) remove.mutate(t._id); }}
                    className="btn-ghost !p-1.5 rounded-lg text-red-500 opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <h3 className="font-semibold">{t.name}</h3>
              <p className="text-xs text-gray-400 line-clamp-2 mt-1 min-h-8">{t.description || 'No description'}</p>
              {t.leader && (
                <p className="flex items-center gap-2 text-sm mt-3">
                  <Crown size={14} className="text-amber-500" />
                  <Avatar user={t.leader} size="xs" /> {t.leader.name}
                </p>
              )}
              <div className="flex items-center justify-between mt-4">
                <AvatarGroup users={t.members || []} />
                <span className="text-xs text-gray-400">{t.projects?.length || 0} project(s)</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="No teams yet"
          subtitle={isAdmin ? 'Create a team and assign a leader' : 'You have not been added to a team yet'} />
      )}

      <CreateTeamModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
