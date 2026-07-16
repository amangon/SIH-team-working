import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Users, MessageSquare, FileText, CalendarDays,
  BarChart3, ClipboardList, Shield, LogOut, Zap, FileBarChart,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/teams', icon: Users, label: 'Teams' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/files', icon: FileText, label: 'Files' },
  { to: '/daily-updates', icon: ClipboardList, label: 'Daily Updates' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/reports', icon: FileBarChart, label: 'Reports', roles: ['admin', 'leader'] },
  { to: '/admin', icon: Shield, label: 'Admin Panel', roles: ['admin'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold leading-none">TeamSync AI</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Collaboration Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.filter((n) => !n.roles || n.roles.includes(user?.role)).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            className={({ isActive }) => cn('sidebar-link', isActive && 'sidebar-link-active')}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200/70 dark:border-white/10">
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-3 rounded-xl p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 transition"
        >
          <Avatar user={user} size="sm" />
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </button>
        <button onClick={logout} className="sidebar-link w-full mt-1 text-red-500 hover:text-red-600 dark:hover:text-red-400">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
}
