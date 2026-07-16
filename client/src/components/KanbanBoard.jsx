import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, DragOverlay } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import { CalendarDays, MessageSquare, Paperclip, Code2 } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { AvatarGroup } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui';
import { STATUS_COLUMNS, PRIORITY_STYLES, cn } from '@/utils';

function TaskCard({ task, onClick, dragging }) {
  const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass !rounded-xl p-3.5 cursor-pointer hover:shadow-lg transition-all space-y-2.5 select-none',
        dragging && 'opacity-90 rotate-2 shadow-2xl'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <span className={cn('badge shrink-0', PRIORITY_STYLES[task.priority])}>{task.priority}</span>
      </div>
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map((l) => (
            <span key={l} className="badge bg-purple-500/10 text-purple-500 dark:text-purple-400">{l}</span>
          ))}
        </div>
      )}
      {task.progress > 0 && <ProgressBar value={task.progress} className="!h-1.5" />}
      <div className="flex items-center justify-between">
        <AvatarGroup users={task.assignees || []} max={3} />
        <div className="flex items-center gap-2 text-gray-400">
          {task.codeVersions?.length > 0 && <Code2 size={13} />}
          {task.attachments?.length > 0 && <Paperclip size={13} />}
          {task.deadline && (
            <span className={cn('flex items-center gap-1 text-[11px]', overdue && 'text-red-500 font-medium')}>
              <CalendarDays size={12} /> {format(new Date(task.deadline), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableTask({ task, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task._id, data: { task } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn(isDragging && 'opacity-30')}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

function Column({ column, tasks, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <div className="w-72 shrink-0 flex flex-col">
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className={cn('w-2.5 h-2.5 rounded-full', column.color)} />
        <p className="text-sm font-semibold">{column.label}</p>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-white/10 rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2.5 rounded-2xl p-2 min-h-40 transition-colors',
          isOver ? 'bg-brand-500/10 ring-2 ring-brand-500/30' : 'bg-gray-100/50 dark:bg-white/[0.03]'
        )}
      >
        {tasks.map((t) => <DraggableTask key={t._id} task={t} onClick={() => onTaskClick(t)} />)}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks = [], projectId, onTaskClick }) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(STATUS_COLUMNS.map((c) => [c.key, []]));
    for (const t of tasks) (map[t.status] || map.todo).push(t);
    return map;
  }, [tasks]);

  const move = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}`, { status }),
    // Optimistic update for instant feedback
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const prev = queryClient.getQueryData(['tasks', projectId]);
      queryClient.setQueryData(['tasks', projectId], (old) => ({
        ...old,
        tasks: old.tasks.map((t) => (t._id === id ? { ...t, status } : t)),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(['tasks', projectId], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveTask(e.active.data.current?.task)}
      onDragEnd={(e) => {
        setActiveTask(null);
        const status = e.over?.id;
        const task = e.active.data.current?.task;
        if (status && task && task.status !== status) move.mutate({ id: task._id, status });
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((col) => (
          <Column key={col.key} column={col} tasks={byStatus[col.key]} onTaskClick={onTaskClick} />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} dragging />}</DragOverlay>
    </DndContext>
  );
}
