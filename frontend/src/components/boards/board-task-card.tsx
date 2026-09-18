import type { Task } from '@/lib/tasks';

interface BoardTaskCardProps {
  task: Task;
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

export function BoardTaskCard({ task }: BoardTaskCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">
          {task.issueKey ?? `#${task.id}`}
        </span>

        <span className="text-xs font-medium text-slate-500">
          {priorityLabels[task.priority]}
        </span>
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
    </article>
  );
}
