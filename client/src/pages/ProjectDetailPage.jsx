import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Users, Activity as ActivityIcon, SlidersHorizontal } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { api, getErrorMessage, getAccessToken } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/context/ToastContext';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskModal } from '@/components/TaskModal';
import { Modal } from '@/components/ui/Modal';
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
import { CircularProgress, ProgressBar, Skeleton } from '@/components/ui';
import { cn } from '@/utils';

const PROGRESS_KEYS = ['frontend', 'backend', 'database', 'testing', 'documentation', 'deployment'];

function CreateTaskModal({ open, onClose, project }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', deadline: '', labels: '', assignees: [], estimatedHours: '',
  });

  const create = useMutation({
    mutationFn: () => api.post('/tasks', {
      ...form,
      project: project._id,
      deadline: form.deadline || undefined,
      estimatedHours: Number(form.estimatedHours) || 0,
      labels: form.labels.split(',').map((l) => l.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', project._id] });
      toast('Task created');
      onClose();
      setForm({ title: '', description: '', priority: 'medium', deadline: '', labels: '', assignees: [], estimatedHours: '' });
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const toggleAssignee = (id) =>
    setForm((f) => ({
      ...f,
      assignees: f.assignees.includes(id) ? f.assignees.filter((a) => a !== id) : [...f.assignees, id],
    }));

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Deadline</label>
            <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div>
            <label className="label">Est. hours</label>
            <input type="number" min={0} className="input" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Labels (comma separated)</label>
          <input className="input" placeholder="frontend, api, bug" value={form.labels} onChange={(e) => setForm({ ...form, labels: e.target.value })} />
        </div>
        <div>
          <label className="label">Assign members</label>
          <div className="flex flex-wrap gap-2">
            {project.members?.map((m) => (
              <button type="button" key={m._id} onClick={() => toggleAssignee(m._id)}
                className={cn(
                  'flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm border transition',
                  form.assignees.includes(m._id)
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                    : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                )}>
                <Avatar user={m} size="xs" /> {m.name}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={create.isPending} className="btn-primary w-full">Create Task</button>
      </form>
    </Modal>
  );
}

function ProgressModal({ open, onClose, project }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [values, setValues] = useState(() =>
    Object.fromEntries(PROGRESS_KEYS.map((k) => [k, project.progress?.[k] ?? 0])));

  const save = useMutation({
    mutationFn: () => api.patch(`/projects/${project._id}`, { progress: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project._id] });
      toast('Progress updated');
      onClose();
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Update Progress">
      <div className="space-y-4">
        {PROGRESS_KEYS.map((k) => (
          <div key={k}>
            <label className="label capitalize">{k} — {values[k]}%</label>
            <input type="range" min={0} max={100} value={values[k]}
              onChange={(e) => setValues({ ...values, [k]: Number(e.target.value) })}
              className="w-full accent-indigo-600" />
          </div>
        ))}
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary w-full">Save</button>
      </div>
    </Modal>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const openTaskId = searchParams.get('task');

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data.data),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.get('/tasks', { params: { project: id } }).then((r) => r.data.data),
  });

  const { data: activities } = useQuery({
    queryKey: ['activities', id],
    queryFn: () => api.get('/activities', { params: { project: id, limit: 15 } }).then((r) => r.data.data.activities),
  });

  // Join project room for realtime Kanban + activity updates
  useEffect(() => {
    if (!socket) return;
    socket.emit('project:join', id);
    const refetch = () => queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    socket.on('task:created', refetch);
    socket.on('task:updated', refetch);
    socket.on('task:deleted', refetch);
    const refetchActivity = () => queryClient.invalidateQueries({ queryKey: ['activities', id] });
    socket.on('activity:project', refetchActivity);
    return () => {
      socket.emit('project:leave', id);
      socket.off('task:created', refetch);
      socket.off('task:updated', refetch);
      socket.off('task:deleted', refetch);
      socket.off('activity:project', refetchActivity);
    };
  }, [socket, id, queryClient]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-14 w-1/2" /><Skeleton className="h-96" /></div>;
  }
  const project = data?.project;
  if (!project) return <p className="text-gray-400">Project not found.</p>;

  const isManager = user?.role === 'admin' || String(project.leader?._id) === String(user?.id);
  const canCreateTask = isManager || user?.role === 'leader';

  const downloadReport = async () => {
    const res = await fetch(`/api/reports/project/${id}`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name}-report.pdf`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex flex-wrap items-center gap-6">
        <CircularProgress value={project.overallProgress ?? 0} />
        <div className="flex-1 min-w-52">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-gray-400 mt-1">{project.description}</p>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span className="flex items-center gap-2 text-sm text-gray-400">
              <Users size={14} /> <AvatarGroup users={project.members || []} />
            </span>
            {project.deadline && (
              <span className="text-sm text-gray-400">Due {format(new Date(project.deadline), 'MMM d, yyyy')}</span>
            )}
            <span className="badge bg-brand-500/15 text-brand-500 capitalize">{project.status}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isManager && (
            <button onClick={() => setShowProgress(true)} className="btn-outline"><SlidersHorizontal size={15} /> Progress</button>
          )}
          <button onClick={downloadReport} className="btn-outline"><Download size={15} /> PDF Report</button>
          {canCreateTask && (
            <button onClick={() => setShowCreateTask(true)} className="btn-primary"><Plus size={15} /> New Task</button>
          )}
        </div>
      </div>

      {/* Progress breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {PROGRESS_KEYS.map((k) => (
          <div key={k} className="card !p-4">
            <p className="text-xs text-gray-400 capitalize mb-2">{k}</p>
            <p className="text-lg font-bold mb-1.5">{project.progress?.[k] ?? 0}%</p>
            <ProgressBar value={project.progress?.[k] ?? 0} className="!h-1.5" />
          </div>
        ))}
      </div>

      {/* Kanban */}
      <KanbanBoard
        tasks={tasksData?.tasks || []}
        projectId={id}
        onTaskClick={(t) => setSearchParams({ task: t._id })}
      />

      {/* Activity timeline */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><ActivityIcon size={16} /> Activity Timeline</h3>
        <div className="space-y-3">
          {activities?.length ? activities.map((a) => (
            <div key={a._id} className="flex items-center gap-3">
              <Avatar user={a.actor} size="sm" />
              <p className="text-sm">
                <span className="font-medium">{a.actor?.name || 'System'}</span>{' '}
                <span className="text-gray-400">{a.description}</span>
              </p>
              <span className="ml-auto text-xs text-gray-400 shrink-0">
                {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
              </span>
            </div>
          )) : <p className="text-sm text-gray-400">No activity yet.</p>}
        </div>
      </div>

      <CreateTaskModal open={showCreateTask} onClose={() => setShowCreateTask(false)} project={project} />
      {showProgress && <ProgressModal open onClose={() => setShowProgress(false)} project={project} />}
      {openTaskId && (
        <TaskModal taskId={openTaskId} projectId={id} onClose={() => setSearchParams({})} />
      )}
    </div>
  );
}
