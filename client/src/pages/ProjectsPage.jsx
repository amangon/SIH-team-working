import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, Search, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { api, getErrorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { AvatarGroup } from '@/components/ui/Avatar';
import { ProgressBar, Skeleton, EmptyState } from '@/components/ui';
import { cn } from '@/utils';

const STATUS_BADGES = {
  planning: 'bg-gray-500/15 text-gray-500',
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'on-hold': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  completed: 'bg-brand-500/15 text-brand-600 dark:text-brand-400',
  archived: 'bg-gray-500/15 text-gray-400',
};

function CreateProjectModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', description: '', deadline: '', leader: '', members: [] });

  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => api.get('/users', { params: { limit: 100 } }).then((r) => r.data.data),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: (body) => api.post('/projects', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast('Project created');
      onClose();
      setForm({ name: '', description: '', deadline: '', leader: '', members: [] });
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  const toggleMember = (id) =>
    setForm((f) => ({
      ...f,
      members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id],
    }));

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, leader: form.leader || undefined, deadline: form.deadline || undefined }); }} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Deadline</label>
            <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div>
            <label className="label">Team Leader</label>
            <select className="input" value={form.leader} onChange={(e) => setForm({ ...form, leader: e.target.value })}>
              <option value="">Me</option>
              {usersData?.users?.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Members</label>
          <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 dark:border-white/10 rounded-xl p-2">
            {usersData?.users?.map((u) => (
              <label key={u._id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-sm">
                <input type="checkbox" checked={form.members.includes(u._id)} onChange={() => toggleMember(u._id)}
                  className="accent-indigo-600" />
                {u.name} <span className="text-xs text-gray-400">({u.role})</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={create.isPending} className="btn-primary w-full">Create Project</button>
      </form>
    </Modal>
  );
}

export function ProjectsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, status],
    queryFn: () => api.get('/projects', { params: { search, status, limit: 50 } }).then((r) => r.data.data),
  });

  const canCreate = user?.role === 'admin' || user?.role === 'leader';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.total ?? 0} project(s)</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input !pl-9 !py-2 w-52" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input !py-2 w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.keys(STATUS_BADGES).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Project</button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : data?.projects?.length ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.projects.map((p, i) => (
            <motion.div key={p._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/projects/${p._id}`} className="card block hover:shadow-xl hover:-translate-y-0.5 transition-all h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center">
                    <FolderKanban size={18} className="text-brand-500" />
                  </div>
                  <span className={cn('badge capitalize', STATUS_BADGES[p.status])}>{p.status}</span>
                </div>
                <h3 className="font-semibold truncate">{p.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1 min-h-8">{p.description || 'No description'}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Progress</span><span>{p.overallProgress ?? 0}%</span>
                  </div>
                  <ProgressBar value={p.overallProgress ?? 0} />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <AvatarGroup users={p.members || []} />
                  {p.deadline && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <CalendarDays size={13} /> {format(new Date(p.deadline), 'MMM d')}
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban} title="No projects yet"
          subtitle={canCreate ? 'Create your first project to get started' : 'Ask an admin or leader to add you to a project'}
          action={canCreate && <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Project</button>}
        />
      )}

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
