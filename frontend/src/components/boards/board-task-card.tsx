'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';

import { useDeleteTask } from '@/hooks/tasks/use-delete-task';
import type { Task } from '@/lib/tasks';

interface BoardTaskCardProps {
  task: Task;
  showDelete?: boolean;
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isDeletePending?: boolean;
  disableDrag?: boolean;
}

const priorityLabels = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} satisfies Record<Task['priority'], string>;

const issueTypeLabels = {
  TASK: 'Task',
  BUG: 'Bug',
  STORY: 'Story',
  EPIC: 'Epic',
} satisfies Record<Task['issueType'], string>;

function TaskCardContent({
  task,
  showDelete = false,
  onDelete,
  isDeletePending = false,
}: BoardTaskCardProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/tasks/${task.id}`}
          className="min-w-0 text-xs font-semibold text-slate-500 hover:text-slate-900"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {task.issueKey ?? `#${task.id}`}
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            {priorityLabels[task.priority]}
          </span>

          {showDelete && (
            <button
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={onDelete}
              disabled={isDeletePending}
              className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Delete ${task.issueKey ?? task.title}`}
            >
              {isDeletePending ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      <h3 className="mt-2 text-sm font-medium text-slate-950">{task.title}</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {issueTypeLabels[task.issueType]}
        </span>

        {task.assignee && (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {task.assignee.email}
          </span>
        )}

        {task.dueDate && (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {task.labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

export function BoardTaskCard({
  task,
  disableDrag = false,
}: BoardTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    disabled: disableDrag,
    data: {
      type: 'task',
      task,
    },
  });

  const deleteTaskMutation = useDeleteTask(task.column?.boardId ?? 0, task.id);

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm(
      `Delete "${task.issueKey ?? task.title}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteTaskMutation.mutateAsync();
    } catch {
      return;
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab touch-manipulation rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md active:cursor-grabbing ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <TaskCardContent
        task={task}
        showDelete
        onDelete={handleDelete}
        isDeletePending={deleteTaskMutation.isPending}
      />

      {deleteTaskMutation.isError && (
        <p className="mt-2 text-xs text-red-600">Failed to delete issue.</p>
      )}
    </article>
  );
}

export function BoardTaskCardOverlay({ task }: BoardTaskCardProps) {
  return (
    <article className="w-full cursor-grabbing rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <TaskCardContent task={task} />
    </article>
  );
}
