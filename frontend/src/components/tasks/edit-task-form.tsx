'use client';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';

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
    <Card asChild>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Edit issue</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div>
            <Label
              htmlFor="edit-task-title"
              className="text-sm font-medium text-foreground"
            >
              Title
            </Label>

            <Input
              id="edit-task-title"
              {...register('title')}
              type="text"
              className="mt-2 w-full"
            />

            {errors.title && (
              <p className="mt-1 text-sm text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="edit-task-description"
              className="text-sm font-medium text-foreground"
            >
              Description
            </Label>

            <Textarea
              id="edit-task-description"
              {...register('description')}
              rows={6}
              className="mt-2 w-full"
            />

            {errors.description && (
              <p className="mt-1 text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="edit-task-type"
                className="text-sm font-medium text-foreground"
              >
                Issue type
              </Label>

              <NativeSelect
                id="edit-task-type"
                {...register('issueType')}
                className="mt-2 w-full"
              >
                <option value="TASK">Task</option>
                <option value="BUG">Bug</option>
                <option value="STORY">Story</option>
                <option value="EPIC">Epic</option>
              </NativeSelect>
            </div>

            <div>
              <Label
                htmlFor="edit-task-priority"
                className="text-sm font-medium text-foreground"
              >
                Priority
              </Label>

              <NativeSelect
                id="edit-task-priority"
                {...register('priority')}
                className="mt-2 w-full"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </NativeSelect>
            </div>

            <div>
              <Label
                htmlFor="edit-task-assignee"
                className="text-sm font-medium text-foreground"
              >
                Assignee
              </Label>

              <NativeSelect
                id="edit-task-assignee"
                {...register('assigneeId', {
                  setValueAs: (value) => (value ? Number(value) : undefined),
                })}
                className="mt-2 w-full"
              >
                <option value="">Unassigned</option>

                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.email}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label
                htmlFor="edit-task-due-date"
                className="text-sm font-medium text-foreground"
              >
                Due date
              </Label>

              <Input
                id="edit-task-due-date"
                {...register('dueDate')}
                type="date"
                className="mt-2 w-full"
              />
            </div>
          </div>

          {updateTaskMutation.isError && (
            <p className="text-sm text-destructive">Failed to update issue.</p>
          )}

          <div className="flex gap-3">
            <Button variant="default" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>

            <Button variant="outline" type="button" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
