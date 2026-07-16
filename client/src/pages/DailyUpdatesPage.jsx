import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardList, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { api, getErrorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar, Skeleton, EmptyState } from '@/components/ui';

function SubmitUpdateModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    project: '', todayWork: '', tomorrowPlan: '', problems: '', completedPercent: 0, hoursWorked: '',
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-daily'],
    queryFn: () => api.get('/projects', { params: { limit: 50 } }).then((r) => r.data.data.projects),
    enabled: open,
  });

  const submit = useMutation({
    mutationFn: () => api.post('/daily-updates', {
      ...form,
      project: form.project || undefined,
      hoursWorked: Number(form.hoursWorked) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-updates'] });
      toast('Daily update submitted');
      onClose();
      setForm({ project: '', todayWork: '', tomorrowPlan: '', problems: '', completedPercent: 0, hoursWorked: '' });
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Daily Work Update">
      <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="space-y-4">
        <div>
          <label className="label">Project</label>
          <select className="input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
            <option value="">General</option>
            {projects?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Today's work *</label>
          <textarea required className="input min-h-20" value={form.todayWork} onChange={(e) => setForm({ ...form, todayWork: e.target.value })} />
        </div>
        <div>
          <label className="label">Tomorrow's plan</label>
          <textarea className="input min-h-16" value={form.tomorrowPlan} onChange={(e) => setForm({ ...form, tomorrowPlan: e.target.value })} />
        </div>
        <div>
          <label className="label">Problems / blockers</label>
          <textarea className="input min-h-16" value={form.problems} onChange={(e) => setForm({ ...form, problems: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Completed % — {form.completedPercent}%</label>
            <input type="range" min={0} max={100} className="w-full accent-indigo-600 mt-2"
              value={form.completedPercent} onChange={(e) => setForm({ ...form, completedPercent: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Hours worked</label>
            <input type="number" min={0} max={24} step={0.5} className="input"
              value={form.hoursWorked} onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })} />
          </div>
        </div>
        <button type="submit" disabled={submit.isPending} className="btn-primary w-full">Submit Update</button>
      </form>
    </Modal>
  );
}

export function DailyUpdatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSubmit, setShowSubmit] = useState(false);
  const isManager = user?.role !== 'member';

  const { data, isLoading } = useQuery({
    queryKey: ['daily-updates'],
    queryFn: () => api.get('/daily-updates').then((r) => r.data.data),
  });

  const review = useMutation({
    mutationFn: ({ id, note }) => api.patch(`/daily-updates/${id}/review`, { reviewNote: note }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['daily-updates'] }); toast('Review saved'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <div>
          <h1 className="text-2xl font-bold">Daily Updates</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isManager ? "Team members' daily work reports" : 'Your daily work reports'}
          </p>
        </div>
        <button onClick={() => setShowSubmit(true)} className="btn-primary ml-auto"><Plus size={15} /> Submit Update</button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : data?.updates?.length ? (
        <div className="space-y-4">
          {data.updates.map((u) => (
            <div key={u._id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <Avatar user={u.user} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{u.user?.name}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(u.date), 'EEE, MMM d')} {u.project && `· ${u.project.name}`} · {u.hoursWorked}h
                  </p>
                </div>
                <div className="ml-auto w-36">
                  <p className="text-[10px] text-gray-400 text-right mb-1">{u.completedPercent}% done</p>
                  <ProgressBar value={u.completedPercent} className="!h-1.5" />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-500 font-semibold mb-1">Today</p>
                  <p className="whitespace-pre-wrap">{u.todayWork}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wide text-brand-500 font-semibold mb-1">Tomorrow</p>
                  <p className="whitespace-pre-wrap">{u.tomorrowPlan || '—'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wide text-amber-500 font-semibold mb-1">Blockers</p>
                  <p className="whitespace-pre-wrap">{u.problems || 'None'}</p>
                </div>
              </div>
              {u.reviewNote && (
                <p className="text-xs mt-3 text-gray-400 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Review: {u.reviewNote}
                </p>
              )}
              {isManager && !u.reviewedBy && (
                <button
                  className="btn-outline !py-1.5 mt-3 text-xs"
                  onClick={() => {
                    const note = prompt('Review note (optional):') ?? '';
                    review.mutate({ id: u._id, note });
                  }}>
                  Mark reviewed
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No updates yet" subtitle="Submit your first daily work report"
          action={<button onClick={() => setShowSubmit(true)} className="btn-primary"><Plus size={15} /> Submit Update</button>} />
      )}

      <SubmitUpdateModal open={showSubmit} onClose={() => setShowSubmit(false)} />
    </div>
  );
}
