import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, ScrollText, Database, Download, Ban, Trash2, ShieldCheck, Search,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, getAccessToken, getErrorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton, EmptyState } from '@/components/ui';
import { cn } from '@/utils';

const TABS = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'audit', label: 'Audit Logs', icon: ScrollText },
  { key: 'system', label: 'System', icon: Database },
];

function UsersTab() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => api.get('/users', { params: { search, limit: 50 } }).then((r) => r.data.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  const onError = (e) => toast(getErrorMessage(e), 'error');

  const setRole = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { invalidate(); toast('Role updated'); }, onError,
  });
  const toggleBlock = useMutation({
    mutationFn: (id) => api.patch(`/admin/users/${id}/block`),
    onSuccess: () => { invalidate(); toast('User updated'); }, onError,
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { invalidate(); toast('User deleted'); }, onError,
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input !pl-9 !py-2" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="card !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/60 dark:border-white/10 text-left text-xs text-gray-400">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map((u) => (
                <tr key={u._id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar user={u} size="sm" />
                      <div>
                        <p className="font-medium">{u.name} {u._id === me?.id && <span className="text-xs text-gray-400">(you)</span>}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="input !py-1 !w-28 !text-xs"
                      value={u.role}
                      disabled={u._id === me?.id}
                      onChange={(e) => setRole.mutate({ id: u._id, role: e.target.value })}
                    >
                      {['admin', 'leader', 'member'].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', u.isBlocked ? 'bg-red-500/15 text-red-500' : 'bg-emerald-500/15 text-emerald-500')}>
                      {u.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        title={u.isBlocked ? 'Unblock' : 'Block'}
                        disabled={u._id === me?.id}
                        onClick={() => toggleBlock.mutate(u._id)}
                        className="btn-ghost !p-1.5 rounded-lg text-amber-500 disabled:opacity-30"
                      >
                        <Ban size={14} />
                      </button>
                      <button
                        title="Delete"
                        disabled={u._id === me?.id}
                        onClick={() => { if (confirm(`Delete ${u.name}? This cannot be undone.`)) remove.mutate(u._id); }}
                        className="btn-ghost !p-1.5 rounded-lg text-red-500 disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/admin/audit-logs').then((r) => r.data.data),
  });

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  return data?.logs?.length ? (
    <div className="space-y-2">
      {data.logs.map((l) => (
        <div key={l._id} className="card !p-3.5 flex items-center gap-3 text-sm">
          <ShieldCheck size={15} className="text-brand-500 shrink-0" />
          <span className="font-medium">{l.actor?.name || 'System'}</span>
          <span className="badge bg-gray-500/10 text-gray-500 font-mono">{l.action}</span>
          {l.target && <span className="text-gray-400 truncate">{l.target}</span>}
          <span className="ml-auto text-xs text-gray-400 shrink-0">
            {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  ) : <EmptyState icon={ScrollText} title="No audit logs yet" />;
}

function SystemTab() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => api.get('/admin/system').then((r) => r.data.data),
    refetchInterval: 15_000,
  });

  const backup = async () => {
    const res = await fetch('/api/admin/backup', { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `teamsync-backup-${Date.now()}.json`;
    a.click();
    toast('Backup downloaded');
  };

  if (isLoading) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        {[
          ['Database', data?.dbState, data?.dbState === 'connected' ? 'text-emerald-500' : 'text-red-500'],
          ['Uptime', `${Math.floor((data?.uptimeSeconds || 0) / 60)} min`],
          ['Memory', `${data?.memoryMB} MB`],
          ['Node', data?.nodeVersion],
        ].map(([label, value, color]) => (
          <div key={label} className="card !p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={cn('text-lg font-bold capitalize mt-1', color)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3 text-sm">Service Drivers</h3>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(data?.drivers || {}).map(([k, v]) => (
            <span key={k} className="badge bg-brand-500/10 text-brand-500">{k}: {v}</span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Change drivers via server .env (STORAGE_DRIVER, EMAIL_DRIVER, AI_DRIVER).</p>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3 text-sm">Collections</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(data?.collections || {}).map(([name, count]) => (
            <div key={name} className="flex justify-between text-sm bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
              <span className="text-gray-400">{name}</span><span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={backup} className="btn-primary"><Download size={15} /> Backup Database (JSON)</button>
    </div>
  );
}

export function AdminPage() {
  const [tab, setTab] = useState('users');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <div className="flex gap-1 border-b border-gray-200 dark:border-white/10">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition',
              tab === key ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            )}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'system' && <SystemTab />}
    </div>
  );
}
