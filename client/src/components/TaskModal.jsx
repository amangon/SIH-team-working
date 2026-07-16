import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Sparkles, Send, Trash2, CheckCircle2, Loader2, Upload, History,
} from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar, Skeleton } from '@/components/ui';
import { CodeEditor } from './CodeEditor';
import { AiReviewPanel } from './AiReviewPanel';
import { STATUS_COLUMNS, PRIORITY_STYLES, cn } from '@/utils';

const TABS = ['Details', 'Code', 'AI Review', 'Comments', 'History'];

export function TaskModal({ taskId, projectId, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('Details');
  const [draftCode, setDraftCode] = useState('');
  const [draftLang, setDraftLang] = useState('javascript');
  const [comment, setComment] = useState('');
  const [versionIdx, setVersionIdx] = useState(-1); // -1 = latest

  const { data, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then((r) => r.data.data.task),
    enabled: !!taskId,
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => api.get('/comments', { params: { task: taskId } }).then((r) => r.data.data.comments),
    enabled: !!taskId && tab === 'Comments',
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  const update = useMutation({
    mutationFn: (body) => api.patch(`/tasks/${taskId}`, body),
    onSuccess: invalidate,
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const approve = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/approve`),
    onSuccess: () => { invalidate(); toast('Task approved'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/tasks/${taskId}`),
    onSuccess: () => { invalidate(); toast('Task deleted'); onClose(); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const pushCode = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/code`, { code: draftCode, language: draftLang }),
    onSuccess: () => { invalidate(); setDraftCode(''); toast('Code version uploaded'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const aiReview = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/ai-review`),
    onSuccess: () => { invalidate(); setTab('AI Review'); toast('AI review complete'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const addComment = useMutation({
    mutationFn: () => api.post('/comments', { task: taskId, project: projectId, content: comment }),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const task = data;
  const isManager = user?.role === 'admin' || String(task?.project?.leader) === String(user?.id);
  const versions = task?.codeVersions || [];
  const activeVersion = versionIdx === -1 ? versions.at(-1) : versions[versionIdx];
  const latestReview = task?.aiReviews?.at(-1)?.review;

  return (
    <Modal open={!!taskId} onClose={onClose} title={task?.title || 'Task'} wide>
      {isLoading || !task ? (
        <div className="space-y-3"><Skeleton className="h-8" /><Skeleton className="h-40" /></div>
      ) : (
        <div className="space-y-5">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-white/10 -mx-1 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  'px-3.5 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition',
                  tab === t ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                )}>
                {t}
                {t === 'Code' && versions.length > 0 && <span className="ml-1 text-[10px]">({versions.length})</span>}
              </button>
            ))}
          </div>

          {tab === 'Details' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-300 whitespace-pre-wrap">{task.description || 'No description.'}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="label">Status</label>
                  <select className="input !py-2" value={task.status} onChange={(e) => update.mutate({ status: e.target.value })}>
                    {STATUS_COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <span className={cn('badge !text-sm capitalize mt-1 inline-block', PRIORITY_STYLES[task.priority])}>{task.priority}</span>
                </div>
                <div>
                  <label className="label">Deadline</label>
                  <p className="text-sm mt-1">{task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <label className="label">Hours</label>
                  <p className="text-sm mt-1">{task.loggedHours || 0} / {task.estimatedHours || '—'}</p>
                </div>
              </div>
              <div>
                <label className="label">Progress — {task.progress}%</label>
                <input type="range" min={0} max={100} value={task.progress}
                  onChange={(e) => update.mutate({ progress: Number(e.target.value) })}
                  className="w-full accent-indigo-600" />
                <ProgressBar value={task.progress} className="mt-1" />
              </div>
              <div>
                <label className="label">Assignees</label>
                <div className="flex flex-wrap gap-2">
                  {task.assignees?.map((a) => (
                    <span key={a._id} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-white/5 rounded-full pl-1 pr-3 py-1">
                      <Avatar user={a} size="xs" /> {a.name}
                    </span>
                  ))}
                  {!task.assignees?.length && <p className="text-sm text-gray-400">Unassigned</p>}
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                {isManager && task.status !== 'completed' && (
                  <button onClick={() => approve.mutate()} disabled={approve.isPending} className="btn-primary">
                    <CheckCircle2 size={15} /> Approve & Complete
                  </button>
                )}
                {isManager && (
                  <button onClick={() => { if (confirm('Delete this task?')) remove.mutate(); }} className="btn-danger ml-auto">
                    <Trash2 size={15} /> Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'Code' && (
            <div className="space-y-4">
              {versions.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <History size={14} className="text-gray-400" />
                  <select className="input !py-1.5 !w-auto text-xs" value={versionIdx}
                    onChange={(e) => setVersionIdx(Number(e.target.value))}>
                    <option value={-1}>Latest (v{versions.length})</option>
                    {versions.map((v, i) => (
                      <option key={v._id} value={i}>
                        v{i + 1} · {v.language} · {v.uploadedBy?.name || '—'}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => aiReview.mutate()} disabled={aiReview.isPending} className="btn-primary !py-1.5 ml-auto">
                    {aiReview.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Review with AI
                  </button>
                </div>
              )}
              {activeVersion && (
                <CodeEditor code={activeVersion.code} language={activeVersion.language} readOnly />
              )}
              <div>
                <label className="label">Upload new version</label>
                <CodeEditor code={draftCode} onChange={setDraftCode} language={draftLang} onLanguageChange={setDraftLang} minRows={8} />
                <button onClick={() => pushCode.mutate()} disabled={!draftCode.trim() || pushCode.isPending} className="btn-primary mt-3">
                  <Upload size={15} /> Upload Code
                </button>
              </div>
            </div>
          )}

          {tab === 'AI Review' && (
            latestReview ? <AiReviewPanel review={latestReview} /> : (
              <div className="text-center py-10">
                <Sparkles size={36} className="mx-auto text-purple-400 mb-3" />
                <p className="text-sm text-gray-400 mb-4">No AI review yet. Upload code first, then run a review.</p>
                <button onClick={() => aiReview.mutate()} disabled={aiReview.isPending || !versions.length} className="btn-primary">
                  {aiReview.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  Review with AI
                </button>
              </div>
            )
          )}

          {tab === 'Comments' && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {comments?.length ? comments.map((c) => (
                  <div key={c._id} className="flex gap-2.5">
                    <Avatar user={c.author} size="sm" />
                    <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold">{c.author?.name}</p>
                        <p className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</p>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-gray-400 text-center py-6">No comments yet</p>}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if (comment.trim()) addComment.mutate(); }} className="flex gap-2">
                <input className="input" placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
                <button type="submit" disabled={!comment.trim()} className="btn-primary !px-3"><Send size={15} /></button>
              </form>
            </div>
          )}

          {tab === 'History' && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {[...(task.history || [])].reverse().map((h, i) => (
                <div key={i} className="flex items-center gap-3 text-sm bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                  <span>{h.action}</span>
                  <span className="ml-auto text-xs text-gray-400 shrink-0">
                    {formatDistanceToNow(new Date(h.at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
