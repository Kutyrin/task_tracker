import { TaskLabels } from '@/components/tasks/task-labels';
import type { Task } from '@/lib/tasks';

interface TaskDetailsProps {
  task: Task;
}

const issueTypeLabels = {
  TASK: 'Task',
  BUG: 'Bug',
  STORY: 'Story',
  EPIC: 'Epic',
} satisfies Record<Task['issueType'], string>;

const priorityLabels = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} satisfies Record<Task['priority'], string>;

export function TaskDetails({ task }: TaskDetailsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-slate-500">
            {task.issueKey ?? `#${task.id}`}
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {task.title}
          </h1>
        </div>

        <div className="flex gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
            {issueTypeLabels[task.issueType]}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
            {priorityLabels[task.priority]}
          </span>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-950">Description</h2>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {task.description || 'No description.'}
        </p>
      </div>

      <dl className="mt-8 grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-500">Status</dt>
          <dd className="mt-1 font-medium text-slate-950">
            {task.column?.name ?? 'No column'}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-slate-500">Assignee</dt>
          <dd className="mt-1 font-medium text-slate-950">
            {task.assignee?.email ?? 'Unassigned'}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-slate-500">Reporter</dt>
          <dd className="mt-1 font-medium text-slate-950">
            {task.reporter?.email ?? 'Unknown'}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-slate-500">Due date</dt>
          <dd className="mt-1 font-medium text-slate-950">
            {task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : 'No due date'}
          </dd>
        </div>
      </dl>

      <TaskLabels
        taskId={task.id}
        projectId={task.projectId}
        initialLabels={task.labels.map((label) => ({
          id: label.id,
          name: label.name,
          createdAt: new Date(0).toISOString(),
          projectId: task.projectId ?? 0,
        }))}
      />
    </div>
  );
}
