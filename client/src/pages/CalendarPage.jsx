import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils';

const TYPE_COLORS = {
  meeting: 'bg-brand-500',
  deadline: 'bg-red-500',
  sprint: 'bg-purple-500',
  hackathon: 'bg-amber-500',
  event: 'bg-emerald-500',
};

function AddEventModal({ open, onClose, date }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', type: 'meeting', start: '', link: '', description: '' });

  const create = useMutation({
    mutationFn: () => api.post('/meetings', { ...form, start: form.start || date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast('Event created');
      onClose();
      setForm({ title: '', type: 'meeting', start: '', link: '', description: '' });
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Event">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.keys(TYPE_COLORS).map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date & time</label>
            <input type="datetime-local" required className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Meeting link (optional)</label>
          <input className="input" placeholder="https://meet…" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        </div>
        <button type="submit" disabled={create.isPending} className="btn-primary w-full">Add Event</button>
      </form>
    </Modal>
  );
}

export function CalendarPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const canCreate = user?.role !== 'member';

  const from = startOfWeek(startOfMonth(month));
  const to = endOfWeek(endOfMonth(month));

  const { data } = useQuery({
    queryKey: ['calendar', format(month, 'yyyy-MM')],
    queryFn: () => api.get('/meetings', { params: { from: from.toISOString(), to: to.toISOString() } })
      .then((r) => r.data.data.events),
  });

  const days = useMemo(() => eachDayOfInterval({ start: from, end: to }), [month]); // eslint-disable-line
  const eventsFor = (day) => (data || []).filter((e) => isSameDay(new Date(e.start), day));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setMonth(subMonths(month, 1))} className="btn-ghost !p-2 rounded-xl"><ChevronLeft size={17} /></button>
          <span className="font-semibold w-36 text-center">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="btn-ghost !p-2 rounded-xl"><ChevronRight size={17} /></button>
          {canCreate && <button onClick={() => setShowAdd(true)} className="btn-primary ml-2"><Plus size={15} /> Event</button>}
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200/60 dark:border-white/10">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <p key={d} className="text-center text-xs font-semibold text-gray-400 py-2.5">{d}</p>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const events = eventsFor(day);
            const today = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()}
                className={cn(
                  'min-h-24 p-1.5 border-b border-r border-gray-100 dark:border-white/5',
                  !isSameMonth(day, month) && 'opacity-40'
                )}>
                <p className={cn(
                  'text-xs w-6 h-6 flex items-center justify-center rounded-full mb-1',
                  today && 'bg-brand-600 text-white font-bold'
                )}>
                  {format(day, 'd')}
                </p>
                <div className="space-y-1">
                  {events.slice(0, 3).map((e) => (
                    <div key={`${e.id}-${e.title}`} title={`${e.title}${e.project ? ` · ${e.project}` : ''}`}
                      className="flex items-center gap-1 text-[10px] truncate rounded px-1 py-0.5 bg-gray-100 dark:bg-white/10">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', TYPE_COLORS[e.type] || 'bg-gray-400')} />
                      <span className="truncate">{e.title}</span>
                    </div>
                  ))}
                  {events.length > 3 && <p className="text-[10px] text-gray-400 px-1">+{events.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {Object.entries(TYPE_COLORS).map(([t, c]) => (
          <span key={t} className="flex items-center gap-1.5 text-xs text-gray-400 capitalize">
            <span className={cn('w-2.5 h-2.5 rounded-full', c)} /> {t}
          </span>
        ))}
      </div>

      <AddEventModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
