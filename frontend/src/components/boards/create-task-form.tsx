'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { BoardColumn } from '@/lib/boards';
import type { IssueType, TaskPriority, TaskUser } from '@/lib/tasks';
import { useCreateTask } from '@/hooks/tasks/use-create-task';

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must contain at most 200 characters'),

  description: z
    .string()
    .trim()
    .max(5000, 'Description must contain at most 5000 characters'),

  issueType: z.enum(['TASK', 'BUG', 'STORY', 'EPIC']),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),

  columnId: z.number().int().positive(),

  assigneeId: z.number().int().positive().optional(),

  dueDate: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface CreateTaskFormProps {
  boardId: number;
  projectId: number;
  columns: BoardColumn[];
  members: TaskUser[];
}

export function CreateTaskForm({
  boardId,
  projectId,
  columns,
  members,
}: CreateTaskFormProps) {
  const createTaskMutation = useCreateTask(boardId);

  const orderedColumns = [...columns].sort((a, b) => a.position - b.position);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      issueType: 'TASK',
      priority: 'MEDIUM',
      columnId: orderedColumns[0]?.id ?? 0,
      assigneeId: undefined,
      dueDate: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createTaskMutation.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        issueType: values.issueType as IssueType,
        priority: values.priority as TaskPriority,
        projectId,
        columnId: values.columnId,
        assigneeId: values.assigneeId,
        dueDate: values.dueDate || undefined,
      });

      reset({
        title: '',
        description: '',
        issueType: 'TASK',
        priority: 'MEDIUM',
        columnId: orderedColumns[0]?.id ?? 0,
        assigneeId: undefined,
        dueDate: '',
      });
    } catch {
      return;
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Create issue</h2>

        <p className="mt-1 text-sm text-slate-600">
          Add a task, bug, story, or epic to this board.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="task-title"
            className="text-sm font-medium text-slate-700"
          >
            Title
          </label>

          <input
            id="task-title"
            {...register('title')}
            type="text"
            autoComplete="off"
            placeholder="Implement authentication"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
          />

          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="task-description"
            className="text-sm font-medium text-slate-700"
          >
            Description
          </label>

          <textarea
            id="task-description"
            {...register('description')}
            rows={4}
            placeholder="Describe the issue..."
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
          />

          {errors.description && (
            <p className="mt-1 text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="task-type"
              className="text-sm font-medium text-slate-700"
            >
              Issue type
            </label>

            <select
              id="task-type"
              {...register('issueType')}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            >
              <option value="TASK">Task</option>
              <option value="BUG">Bug</option>
              <option value="STORY">Story</option>
              <option value="EPIC">Epic</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="task-priority"
              className="text-sm font-medium text-slate-700"
            >
              Priority
            </label>

            <select
              id="task-priority"
              {...register('priority')}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="task-column"
              className="text-sm font-medium text-slate-700"
            >
              Column
            </label>

            <select
              id="task-column"
              {...register('columnId', {
                setValueAs: (value) => Number(value),
              })}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            >
              {orderedColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="task-assignee"
              className="text-sm font-medium text-slate-700"
            >
              Assignee
            </label>

            <select
              id="task-assignee"
              {...register('assigneeId', {
                setValueAs: (value) => (value ? Number(value) : undefined),
              })}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            >
              <option value="">Unassigned</option>

              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-w-xs">
          <label
            htmlFor="task-due-date"
            className="text-sm font-medium text-slate-700"
          >
            Due date
          </label>

          <input
            id="task-due-date"
            {...register('dueDate')}
            type="date"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
          />
        </div>

        {createTaskMutation.isError && (
          <p className="text-sm text-red-600">Failed to create issue.</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || orderedColumns.length === 0}
          className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating...' : 'Create issue'}
        </button>
      </form>
    </div>
  );
}
