import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Bell, Moon, Sun, FolderKanban, CheckSquare, User, FileText, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils';

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  const { data } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get('/search', { params: { q } }).then((r) => r.data.data),
    enabled: q.length >= 2,
  });

  useEffect(() => {
    const onClick = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (path) => { setOpen(false); setQ(''); navigate(path); };
  const Section = ({ icon: Icon, title, items, render, path }) =>
    items?.length ? (
      <div className="px-2 py-1.5">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 px-2 mb-1">{title}</p>
        {items.map((item) => (
          <button key={item._id} onClick={() => go(path(item))}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-sm text-left">
            <Icon size={14} className="text-gray-400 shrink-0" />
            <span className="truncate">{render(item)}</span>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div ref={boxRef} className="relative flex-1 max-w-md">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search projects, tasks, files, people…"
        className="input !pl-10 !py-2"
      />
      {open && q.length >= 2 && data && (
        <div className="absolute top-full mt-2 w-full glass shadow-2xl z-50 max-h-96 overflow-y-auto py-1">
          <Section icon={FolderKanban} title="Projects" items={data.projects}
            render={(p) => p.name} path={(p) => `/projects/${p._id}`} />
          <Section icon={CheckSquare} title="Tasks" items={data.tasks}
            render={(t) => `${t.title} · ${t.project?.name || ''}`}
            path={(t) => `/projects/${t.project?._id || t.project}?task=${t._id}`} />
          <Section icon={User} title="People" items={data.users}
            render={(u) => `${u.name} (${u.email})`} path={() => '/teams'} />
          <Section icon={FileText} title="Files" items={data.files}
            render={(f) => f.originalName} path={() => '/files'} />
          <Section icon={MessageSquare} title="Messages" items={data.messages}
            render={(m) => `${m.sender?.name}: ${m.content.slice(0, 50)}`} path={() => '/chat'} />
          {!Object.values(data).some((arr) => arr.length) && (
            <p className="text-sm text-gray-400 text-center py-4">No results for “{q}”</p>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const boxRef = useRef(null);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: () => api.patch('/notifications/read'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const onClick = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = data?.unreadCount || 0;

  return (
    <div ref={boxRef} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost !p-2.5 rounded-xl relative">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 glass shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60 dark:border-white/10">
            <p className="font-semibold text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={() => markRead.mutate()} className="text-xs text-brand-500 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data?.notifications?.length ? data.notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition',
                  !n.read && 'bg-brand-500/5'
                )}
              >
                <p className="text-sm font-medium flex items-center gap-2">
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                  {n.title}
                </p>
                {n.body && <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>}
                <p className="text-[10px] text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </button>
            )) : <p className="text-sm text-gray-400 text-center py-8">No notifications yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-4 lg:px-8 py-3.5 border-b border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-[#0b0d14]/70 backdrop-blur-xl">
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-1.5">
        <button onClick={toggle} className="btn-ghost !p-2.5 rounded-xl">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <NotificationBell />
      </div>
    </header>
  );
}
