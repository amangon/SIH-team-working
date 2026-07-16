import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Trash2, Download, Image as ImageIcon, FileArchive, FileVideo, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, getErrorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton, EmptyState } from '@/components/ui';
import { formatBytes, cn } from '@/utils';

const fileIcon = (mime = '') => {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.includes('zip') || mime.includes('rar')) return FileArchive;
  return FileText;
};

export function FilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);

  const { data: projects } = useQuery({
    queryKey: ['projects-files'],
    queryFn: () => api.get('/projects', { params: { limit: 50 } }).then((r) => r.data.data.projects),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['files', search, projectFilter],
    queryFn: () => api.get('/files', { params: { search, project: projectFilter || undefined } }).then((r) => r.data.data),
  });

  const uploadFiles = useMutation({
    mutationFn: (fileList) => {
      const fd = new FormData();
      for (const f of fileList) fd.append('files', f);
      if (projectFilter) fd.append('project', projectFilter);
      return api.post('/files', fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast('Files uploaded');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/files/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['files'] }); toast('File deleted'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Files</h1>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input !pl-9 !py-2 w-48" placeholder="Search files…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input !py-2 w-44" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All projects</option>
            {projects?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <button onClick={() => inputRef.current?.click()} className="btn-primary"><Upload size={15} /> Upload</button>
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files.length && uploadFiles.mutate(e.target.files)} />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles.mutate(e.dataTransfer.files);
        }}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center transition-colors',
          dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-gray-300 dark:border-white/15'
        )}
      >
        <Upload size={28} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-400">Drag & drop files here, or click Upload · up to 50 MB each</p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : data?.files?.length ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {data.files.map((f) => {
            const Icon = fileIcon(f.mimeType);
            const isImage = f.mimeType.startsWith('image/');
            return (
              <div key={f._id} className="card !p-4 flex items-center gap-3 group">
                {isImage ? (
                  <img src={f.url} alt="" className="w-11 h-11 rounded-xl object-cover cursor-pointer" onClick={() => setPreview(f)} />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                    <Icon size={19} className="text-brand-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.originalName}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    {formatBytes(f.size)} · v{f.version} · {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Avatar user={f.uploadedBy} size="xs" />
                    <span className="text-[11px] text-gray-400">{f.uploadedBy?.name}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                  <a href={f.url} download={f.originalName} className="btn-ghost !p-1.5 rounded-lg"><Download size={14} /></a>
                  {(f.uploadedBy?._id === user?.id || user?.role === 'admin') && (
                    <button onClick={() => remove.mutate(f._id)} className="btn-ghost !p-1.5 rounded-lg text-red-500"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={FileText} title="No files yet" subtitle="Upload documents, images, code archives and more" />
      )}

      {/* Image preview lightbox */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-8" onClick={() => setPreview(null)}>
          <img src={preview.url} alt={preview.originalName} className="max-h-full max-w-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
