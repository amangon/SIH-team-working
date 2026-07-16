import { useQuery } from '@tanstack/react-query';
import { Trophy, Clock, Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '@/services/api';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton, EmptyState, CountUp } from '@/components/ui';
import { cn } from '@/utils';

const MEDAL = ['text-amber-400', 'text-gray-400', 'text-amber-700'];

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['performance'],
    queryFn: () => api.get('/analytics/performance').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    );
  }

  const projectChart = (data?.projectPerformance || []).map((p) => ({
    name: p.name?.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    completed: p.completed,
    pending: p.total - p.completed,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="ml-auto card !py-3 !px-5 flex items-center gap-3">
          <Timer size={18} className="text-brand-500" />
          <div>
            <p className="text-lg font-bold"><CountUp value={data?.avgCompletionHours ?? 0} suffix="h" /></p>
            <p className="text-[10px] text-gray-400">Avg completion time</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Leaderboard */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Trophy size={16} className="text-amber-400" /> Most Active Members</h3>
          {data?.memberPerformance?.length ? (
            <div className="space-y-2.5">
              {data.memberPerformance.map((m, i) => (
                <div key={m._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5">
                  <span className={cn('font-bold text-sm w-5', MEDAL[i] || 'text-gray-500')}>#{i + 1}</span>
                  <Avatar user={m.user} size="sm" />
                  <p className="text-sm font-medium flex-1">{m.user?.name}</p>
                  <div className="text-right">
                    <p className="text-sm font-bold">{m.completedTasks}</p>
                    <p className="text-[10px] text-gray-400">tasks done</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Trophy} title="No completed tasks yet" />}
        </div>

        {/* Hours worked */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock size={16} className="text-sky-500" /> Work Hours (30 days)</h3>
          {data?.hoursByUser?.length ? (
            <div className="space-y-2.5">
              {data.hoursByUser.map((h) => (
                <div key={h._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5">
                  <Avatar user={h.user} size="sm" />
                  <p className="text-sm font-medium flex-1">{h.user?.name}</p>
                  <p className="text-sm font-bold">{h.hours}h</p>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Clock} title="No hours logged yet" subtitle="Hours come from daily updates" />}
        </div>

        {/* Project performance */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold mb-4">Project Performance</h3>
          {projectChart.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={projectChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 12, color: '#fff' }} />
                <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Completed" />
                <Bar dataKey="pending" stackId="a" fill="#6366f1" radius={[8, 8, 0, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={Trophy} title="No project data yet" />}
        </div>
      </div>
    </div>
  );
}
