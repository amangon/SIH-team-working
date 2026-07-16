import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download, Loader2 } from 'lucide-react';
import { api, getAccessToken, getErrorMessage } from '@/services/api';
import { useToast } from '@/context/ToastContext';

async function downloadPdf(path, filename, toast) {
  try {
    const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    if (!res.ok) throw new Error((await res.json()).message || 'Download failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    toast(getErrorMessage(err), 'error');
  }
}

function ReportCard({ title, subtitle, onDownload }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="card flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center">
        <FileBarChart size={19} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-gray-400 truncate">{subtitle}</p>
      </div>
      <button
        onClick={async () => { setLoading(true); await onDownload(); setLoading(false); }}
        disabled={loading}
        className="btn-outline !py-2"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} PDF
      </button>
    </div>
  );
}

export function ReportsPage() {
  const { toast } = useToast();

  const { data: projects } = useQuery({
    queryKey: ['projects-reports'],
    queryFn: () => api.get('/projects', { params: { limit: 50 } }).then((r) => r.data.data.projects),
  });
  const { data: users } = useQuery({
    queryKey: ['users-reports'],
    queryFn: () => api.get('/users', { params: { limit: 100 } }).then((r) => r.data.data.users),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">Generate and download PDF reports</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Period Reports</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {['daily', 'weekly', 'monthly'].map((type) => (
            <ReportCard
              key={type}
              title={`${type[0].toUpperCase()}${type.slice(1)} Report`}
              subtitle={`Tasks, updates & hours for the last ${type === 'daily' ? 'day' : type === 'weekly' ? '7 days' : '30 days'}`}
              onDownload={() => downloadPdf(`/reports/period?type=${type}`, `${type}-report.pdf`, toast)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Project Reports</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {projects?.map((p) => (
            <ReportCard
              key={p._id}
              title={p.name}
              subtitle={`Status: ${p.status} · ${p.overallProgress ?? 0}% complete`}
              onDownload={() => downloadPdf(`/reports/project/${p._id}`, `${p.name}-report.pdf`, toast)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Member Reports</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {users?.map((u) => (
            <ReportCard
              key={u._id}
              title={u.name}
              subtitle={`${u.email} · ${u.role}`}
              onDownload={() => downloadPdf(`/reports/member/${u._id}`, `${u.name}-report.pdf`, toast)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
