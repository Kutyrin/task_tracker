'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useUpdateTask } from '@/hooks/tasks/use-update-task';
import type { IssueType, Task, TaskPriority, TaskUser } from '@/lib/tasks';

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must contain at most 200 characters'),

  description: z
    .string()
    .max(5000, 'Description must contain at most 5000 characters'),

  issueType: z.enum(['TASK', 'BUG', 'STORY', 'EPIC']),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),

  assigneeId: z.number().int().positive().optional(),

  dueDate: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface EditTaskFormProps {
  boardId: number;
  task: Task;
  members: TaskUser[];
  onCancel: () => void;
  onSaved: () => void;
}

export function EditTaskForm({
  boardId,
  task,
  members,
  onCancel,
  onSaved,
}: EditTaskFormProps) {
  const updateTaskMutation = useUpdateTask(boardId, task.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task.title,
      description: task.description ?? '',
      issueType: task.issueType,
      priority: task.priority,
      assigneeId: task.assigneeId ?? undefined,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateTaskMutation.mutateAsync({
        title: values.title,
        description: values.description || null,
        issueType: values.issueType as IssueType,
        priority: values.priority as TaskPriority,
        assigneeId: values.assigneeId ?? null,
        dueDate: values.dueDate || null,
      });

      onSaved();
    } catch {
      return;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Edit issue</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="edit-task-title"
            className="text-sm font-medium text-slate-700"
          >
            Title
          </label>

          <input
            id="edit-task-title"
            {...register('title')}
            type="text"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
          />

          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="edit-task-description"
            className="text-sm font-medium text-slate-700"
          >
            Description
          </label>

          <textarea
            id="edit-task-description"
            {...register('description')}
            rows={6}
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
          />

          {errors.description && (
            <p className="mt-1 text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="edit-task-type"
              className="text-sm font-medium text-slate-700"
            >
              Issue type
            </label>

            <select
              id="edit-task-type"
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
              htmlFor="edit-task-priority"
              className="text-sm font-medium text-slate-700"
            >
              Priority
            </label>

            <select
              id="edit-task-priority"
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
              htmlFor="edit-task-assignee"
              className="text-sm font-medium text-slate-700"
            >
              Assignee
            </label>

            <select
              id="edit-task-assignee"
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

          <div>
            <label
              htmlFor="edit-task-due-date"
              className="text-sm font-medium text-slate-700"
            >
              Due date
            </label>

            <input
              id="edit-task-due-date"
              {...register('dueDate')}
              type="date"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>
        </div>

        {updateTaskMutation.isError && (
          <p className="text-sm text-red-600">Failed to update issue.</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
