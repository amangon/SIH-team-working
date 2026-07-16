import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Hash, Smile, Reply, X } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { api, getErrorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/context/ToastContext';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton, EmptyState } from '@/components/ui';
import { cn } from '@/utils';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🚀', '💡', '🙏'];

const dmRoom = (a, b) => `dm:${[String(a), String(b)].sort().join(':')}`;

export function ChatPage() {
  const { user } = useAuth();
  const { socket, online } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [room, setRoom] = useState(null);
  const [roomLabel, setRoomLabel] = useState('');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typing, setTyping] = useState(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const { data: projects } = useQuery({
    queryKey: ['projects-chat'],
    queryFn: () => api.get('/projects', { params: { limit: 50 } }).then((r) => r.data.data.projects),
  });
  const { data: users } = useQuery({
    queryKey: ['users-chat'],
    queryFn: () => api.get('/users', { params: { limit: 100 } }).then((r) => r.data.data.users),
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', room],
    queryFn: () => api.get(`/chat/${encodeURIComponent(room)}/messages`).then((r) => r.data.data.messages),
    enabled: !!room,
  });

  const send = useMutation({
    mutationFn: () => api.post(`/chat/${encodeURIComponent(room)}/messages`, {
      content: text, replyTo: replyTo?._id,
    }),
    onSuccess: () => { setText(''); setReplyTo(null); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  // Socket: join room, receive messages + typing
  useEffect(() => {
    if (!socket || !room) return;
    socket.emit('chat:join', room);
    api.post(`/chat/${encodeURIComponent(room)}/read`).catch(() => {});

    const onMessage = (msg) => {
      if (msg.room !== room) return;
      queryClient.setQueryData(['messages', room], (old = []) =>
        old.some((m) => m._id === msg._id) ? old : [...old, msg]);
    };
    const onTyping = ({ room: r, name, userId }) => {
      if (r !== room || userId === user?.id) return;
      setTyping(name);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(null), 2000);
    };
    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    return () => {
      socket.emit('chat:leave', room);
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
    };
  }, [socket, room, queryClient, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectProject = (p) => { setRoom(String(p._id)); setRoomLabel(`# ${p.name}`); };
  const selectUser = (u) => { setRoom(dmRoom(user.id, u._id)); setRoomLabel(u.name); };

  return (
    <div className="flex gap-4 h-[calc(100vh-8.5rem)]">
      {/* Room list */}
      <div className="w-64 shrink-0 card !p-3 overflow-y-auto hidden md:block">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 px-2 mb-2">Project Channels</p>
        {projects?.map((p) => (
          <button key={p._id} onClick={() => selectProject(p)}
            className={cn('sidebar-link w-full !py-2', room === String(p._id) && 'sidebar-link-active')}>
            <Hash size={15} /> <span className="truncate">{p.name}</span>
          </button>
        ))}
        <p className="text-[10px] uppercase tracking-wider text-gray-400 px-2 mb-2 mt-4">Direct Messages</p>
        {users?.filter((u) => u._id !== user?.id).map((u) => (
          <button key={u._id} onClick={() => selectUser(u)}
            className={cn('sidebar-link w-full !py-2', room === dmRoom(user.id, u._id) && 'sidebar-link-active')}>
            <span className="relative">
              <Avatar user={u} size="xs" />
              {online.has(u._id) && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0b0d14]" />}
            </span>
            <span className="truncate">{u.name}</span>
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 card !p-0 flex flex-col overflow-hidden">
        {!room ? (
          <EmptyState icon={Hash} title="Select a channel or person" subtitle="Realtime chat powered by Socket.IO" />
        ) : (
          <>
            <div className="px-5 py-3.5 border-b border-gray-200/60 dark:border-white/10 font-semibold flex items-center gap-2">
              {roomLabel}
              {typing && <span className="text-xs text-gray-400 font-normal animate-pulse">· {typing} is typing…</span>}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-2/3" />)
              ) : messages?.length ? messages.map((m) => {
                const mine = m.sender?._id === user?.id;
                return (
                  <div key={m._id} className={cn('flex gap-2.5 group', mine && 'flex-row-reverse')}>
                    <Avatar user={m.sender} size="sm" />
                    <div className={cn('max-w-[70%]')}>
                      <div className={cn(
                        'rounded-2xl px-4 py-2.5',
                        mine ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white' : 'bg-gray-100 dark:bg-white/10'
                      )}>
                        {m.replyTo && (
                          <p className={cn('text-xs border-l-2 pl-2 mb-1.5 opacity-70', mine ? 'border-white/50' : 'border-brand-500')}>
                            {m.replyTo.sender?.name}: {m.replyTo.content?.slice(0, 60)}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                      <div className={cn('flex items-center gap-2 mt-1 px-1', mine && 'flex-row-reverse')}>
                        <p className="text-[10px] text-gray-400">
                          {!mine && `${m.sender?.name} · `}
                          {isToday(new Date(m.createdAt)) ? format(new Date(m.createdAt), 'HH:mm') : format(new Date(m.createdAt), 'MMM d, HH:mm')}
                          {mine && m.readBy?.length > 1 && ' · seen'}
                        </p>
                        <button onClick={() => setReplyTo(m)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-brand-500 transition">
                          <Reply size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }) : <EmptyState icon={Hash} title="No messages yet" subtitle="Say hello 👋" />}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-gray-200/60 dark:border-white/10">
              {replyTo && (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 mb-2">
                  <Reply size={12} /> Replying to <b>{replyTo.sender?.name}</b>: {replyTo.content?.slice(0, 50)}
                  <button onClick={() => setReplyTo(null)} className="ml-auto"><X size={13} /></button>
                </div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}
                className="flex items-center gap-2 relative"
              >
                <button type="button" onClick={() => setShowEmoji((s) => !s)} className="btn-ghost !p-2.5 rounded-xl">
                  <Smile size={18} />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-14 left-0 glass p-2 flex gap-1 flex-wrap w-64 z-10">
                    {EMOJIS.map((e) => (
                      <button key={e} type="button" className="text-xl p-1 hover:scale-125 transition"
                        onClick={() => { setText((t) => t + e); setShowEmoji(false); }}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  className="input"
                  placeholder={`Message ${roomLabel}…`}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    socket?.emit('chat:typing', { room });
                  }}
                />
                <button type="submit" disabled={!text.trim() || send.isPending} className="btn-primary !px-3.5">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
