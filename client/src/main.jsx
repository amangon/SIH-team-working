import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppLayout, RequireRole } from '@/layouts/AppLayout';
import {
  LoginPage, SignupPage, VerifyOtpPage, ForgotPasswordPage, ResetPasswordPage,
} from '@/pages/auth/AuthPages';
import { Skeleton } from '@/components/ui';
import '@/styles/index.css';

// Code-split the heavier pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })));
const TeamsPage = lazy(() => import('@/pages/TeamsPage').then((m) => ({ default: m.TeamsPage })));
const ChatPage = lazy(() => import('@/pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const FilesPage = lazy(() => import('@/pages/FilesPage').then((m) => ({ default: m.FilesPage })));
const DailyUpdatesPage = lazy(() => import('@/pages/DailyUpdatesPage').then((m) => ({ default: m.DailyUpdatesPage })));
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
});

const PageFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-56" />
    <Skeleton className="h-72" />
  </div>
);

/** Redirect authenticated users away from auth pages */
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
      <Route path="/verify-otp" element={<GuestOnly><VerifyOtpPage /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
      <Route path="/reset-password/:token" element={<GuestOnly><ResetPasswordPage /></GuestOnly>} />

      <Route element={<AppLayout />}>
        <Route index element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
        <Route path="projects" element={<Suspense fallback={<PageFallback />}><ProjectsPage /></Suspense>} />
        <Route path="projects/:id" element={<Suspense fallback={<PageFallback />}><ProjectDetailPage /></Suspense>} />
        <Route path="teams" element={<Suspense fallback={<PageFallback />}><TeamsPage /></Suspense>} />
        <Route path="chat" element={<Suspense fallback={<PageFallback />}><ChatPage /></Suspense>} />
        <Route path="files" element={<Suspense fallback={<PageFallback />}><FilesPage /></Suspense>} />
        <Route path="daily-updates" element={<Suspense fallback={<PageFallback />}><DailyUpdatesPage /></Suspense>} />
        <Route path="calendar" element={<Suspense fallback={<PageFallback />}><CalendarPage /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<PageFallback />}><AnalyticsPage /></Suspense>} />
        <Route path="reports" element={
          <RequireRole roles={['admin', 'leader']}>
            <Suspense fallback={<PageFallback />}><ReportsPage /></Suspense>
          </RequireRole>
        } />
        <Route path="admin" element={
          <RequireRole roles={['admin']}>
            <Suspense fallback={<PageFallback />}><AdminPage /></Suspense>
          </RequireRole>
        } />
        <Route path="settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
