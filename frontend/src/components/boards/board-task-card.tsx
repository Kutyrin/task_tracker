'use client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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
          className="min-w-0 text-xs font-semibold text-muted-foreground hover:text-foreground"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {task.issueKey ?? `#${task.id}`}
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant={task.priority === 'HIGH' ? 'destructive' : 'outline'}
            className={
              task.priority === 'MEDIUM'
                ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : undefined
            }
          >
            {priorityLabels[task.priority]}
          </Badge>

          {showDelete && (
            <Button
              variant="destructive"
              size="sm"
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={onDelete}
              disabled={isDeletePending}

              aria-label={`Delete ${task.issueKey ?? task.title}`}
            >
              {isDeletePending ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      </div>

      <h3 className="mt-2 text-sm font-medium text-foreground">{task.title}</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">{issueTypeLabels[task.issueType]}</Badge>

        {task.assignee && (
          <Badge variant="secondary">{task.assignee.email}</Badge>
        )}

        {task.dueDate && (
          <Badge variant="secondary">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {task.labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <Badge variant="secondary" key={label.id}>
              {label.name}
            </Badge>
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
    <Card asChild>
      <article
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`cursor-grab touch-manipulation rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-input hover:shadow-md active:cursor-grabbing ${
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
          <p className="mt-2 text-xs text-destructive">Failed to delete issue.</p>
        )}
      </article>
    </Card>
  );
}

export function BoardTaskCardOverlay({ task }: BoardTaskCardProps) {
  return (
    <Card asChild>
      <article className="w-full cursor-grabbing rounded-xl border border-border bg-card p-4 shadow-xl">
        <TaskCardContent task={task} />
      </article>
    </Card>
  );
}
