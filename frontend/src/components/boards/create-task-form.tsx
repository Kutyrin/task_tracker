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
    <Card asChild>
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Create issue
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Add a task, bug, story, or epic to this board.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div>
            <Label
              htmlFor="task-title"
              className="text-sm font-medium text-foreground"
            >
              Title
            </Label>

            <Input
              id="task-title"
              {...register('title')}
              type="text"
              autoComplete="off"
              placeholder="Implement authentication"
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
              htmlFor="task-description"
              className="text-sm font-medium text-foreground"
            >
              Description
            </Label>

            <Textarea
              id="task-description"
              {...register('description')}
              rows={4}
              placeholder="Describe the issue..."
              className="mt-2 w-full"
            />

            {errors.description && (
              <p className="mt-1 text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label
                htmlFor="task-type"
                className="text-sm font-medium text-foreground"
              >
                Issue type
              </Label>

              <NativeSelect
                id="task-type"
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
                htmlFor="task-priority"
                className="text-sm font-medium text-foreground"
              >
                Priority
              </Label>

              <NativeSelect
                id="task-priority"
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
                htmlFor="task-column"
                className="text-sm font-medium text-foreground"
              >
                Column
              </Label>

              <NativeSelect
                id="task-column"
                {...register('columnId', {
                  setValueAs: (value) => Number(value),
                })}
                className="mt-2 w-full"
              >
                {orderedColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label
                htmlFor="task-assignee"
                className="text-sm font-medium text-foreground"
              >
                Assignee
              </Label>

              <NativeSelect
                id="task-assignee"
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
          </div>

          <div className="max-w-xs">
            <Label
              htmlFor="task-due-date"
              className="text-sm font-medium text-foreground"
            >
              Due date
            </Label>

            <Input
              id="task-due-date"
              {...register('dueDate')}
              type="date"
              className="mt-2 w-full"
            />
          </div>

          {createTaskMutation.isError && (
            <p className="text-sm text-destructive">Failed to create issue.</p>
          )}

          <Button
            variant="default"
            type="submit"
            disabled={isSubmitting || orderedColumns.length === 0}
          >
            {isSubmitting ? 'Creating...' : 'Create issue'}
          </Button>
        </form>
      </div>
    </Card>
  );
}
