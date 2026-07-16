import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FolderKanban, Users, UserCheck, Clock, CheckCircle2, TrendingUp, CalendarClock,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { CountUp, ProgressBar, Skeleton, EmptyState } from '@/components/ui';
import { PRIORITY_STYLES, cn } from '@/utils';

const PIE_COLORS = ['#9ca3af', '#3b82f6', '#f59e0b', '#a855f7', '#10b981'];
const STATUS_LABELS = { todo: 'Todo', 'in-progress': 'In Progress', review: 'Review', testing: 'Testing', completed: 'Completed' };

function StatCard({ icon: Icon, label, value, suffix, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="card flex items-center gap-4"
    >
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg', gradient)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold"><CountUp value={value ?? 0} suffix={suffix} /></p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" /><Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const cards = data?.cards || {};
  const pieData = Object.entries(data?.taskByStatus || {}).map(([k, v]) => ({
    name: STATUS_LABELS[k] || k, value: v,
  }));
  const lineData = (data?.activityByDay || []).map((d) => ({
    day: format(new Date(d._id), 'EEE'), count: d.count,
  }));
  const barData = (data?.projects || []).slice(0, 6).map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    progress: p.overallProgress ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-400 mt-1">Here's what's happening across your workspace.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={FolderKanban} label="Projects" value={cards.totalProjects} gradient="bg-gradient-to-br from-brand-500 to-indigo-600" />
        <StatCard icon={Users} label="Teams" value={cards.totalTeams} gradient="bg-gradient-to-br from-purple-500 to-fuchsia-600" delay={0.05} />
        <StatCard icon={Clock} label="Pending Tasks" value={cards.pendingTasks} gradient="bg-gradient-to-br from-amber-500 to-orange-600" delay={0.1} />
        <StatCard icon={CheckCircle2} label="Completed" value={cards.completedTasks} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" delay={0.15} />
        <StatCard icon={UserCheck} label="Active Now" value={cards.activeMembers} gradient="bg-gradient-to-br from-sky-500 to-blue-600" delay={0.2} />
        <StatCard icon={TrendingUp} label="Progress" value={cards.progressPercent} suffix="%" gradient="bg-gradient-to-br from-rose-500 to-pink-600" delay={0.25} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Task distribution pie */}
        <div className="card">
          <h3 className="font-semibold mb-4">Task Distribution</h3>
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={4}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 12, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={CheckCircle2} title="No tasks yet" />}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {pieData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        {/* Activity line chart */}
        <div className="card">
          <h3 className="font-semibold mb-4">Activity (7 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 12, color: '#fff' }} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Project progress bars */}
        <div className="card">
          <h3 className="font-semibold mb-4">Project Progress</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 12, color: '#fff' }} />
              <Bar dataKey="progress" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming deadlines */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><CalendarClock size={17} /> Upcoming Deadlines</h3>
        {data?.upcomingDeadlines?.length ? (
          <div className="space-y-2.5">
            {data.upcomingDeadlines.map((t) => (
              <Link key={t._id} to={`/projects/${t.project?._id}?task=${t._id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.project?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('badge', PRIORITY_STYLES[t.priority])}>{t.priority}</span>
                  <span className="text-xs text-gray-400">{format(new Date(t.deadline), 'MMM d')}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : <EmptyState icon={CalendarClock} title="No upcoming deadlines" />}
      </div>
    </div>
  );
}
