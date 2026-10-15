'use client';
import { Button } from '@/components/ui/button';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { CommentsSection } from '@/components/tasks/comments-section';
import { EditTaskForm } from '@/components/tasks/edit-task-form';
import { TaskDetails } from '@/components/tasks/task-details';
import { useTaskRealtime } from '@/hooks/realtime/use-task-realtime';
import { ActivitySection } from '@/components/tasks/activity-section';
import { useTask } from '@/hooks/tasks/use-task';
import { useDeleteTask } from '@/hooks/tasks/use-delete-task';
import { useProjectMembers } from '@/hooks/projects/use-project-members';
import { AttachmentsSection } from '@/components/tasks/attachments-section';

function TaskContent({ taskId }: { taskId: number }) {
  const router = useRouter();
  const { data: task, isPending, isError } = useTask(taskId);
  const { data: members } = useProjectMembers(task?.projectId ?? 0);

  const taskBoardId = task?.column?.boardId ?? null;
  const taskProjectId = task?.projectId ?? null;

  const handleRemoteDelete = useCallback(() => {
    if (taskBoardId) {
      router.replace(`/boards/${taskBoardId}`);
      return;
    }

    if (taskProjectId) {
      router.replace(`/projects/${taskProjectId}`);
    }
  }, [router, taskBoardId, taskProjectId]);

  useTaskRealtime(taskId, taskProjectId, handleRemoteDelete);

  const [isEditing, setIsEditing] = useState(false);
  const deleteTaskMutation = useDeleteTask(task?.column?.boardId ?? 0, taskId);

  if (isPending) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-muted-foreground">Loading issue...</p>
        </div>
      </main>
    );
  }

  if (isError || !task) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <Button asChild variant="outline">
            <Link href="/projects">Back to projects</Link>
          </Button>

          <div className="mt-8 rounded-2xl border border-destructive/25 bg-destructive/10 p-6">
            <h1 className="text-lg font-semibold text-destructive">
              Issue not found
            </h1>

            <p className="mt-2 text-sm text-destructive">
              The issue may not exist or you may not have access to it.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${task.issueKey ?? task.title}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteTaskMutation.mutateAsync();
      router.replace(`/boards/${task.column?.boardId}`);
    } catch {
      return;
    }
  };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap gap-3">
          {task.projectId && (
            <Button asChild variant="outline">
              <Link href={`/projects/${task.projectId}`}>Back to Project</Link>
            </Button>
          )}

          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="default"
            type="button"
            onClick={() => setIsEditing((value) => !value)}
          >
            {isEditing ? 'Close edit' : 'Edit issue'}
          </Button>

          <Button
            variant="destructive"
            type="button"
            onClick={handleDelete}
            disabled={deleteTaskMutation.isPending}
          >
            {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete issue'}
          </Button>
        </div>

        {deleteTaskMutation.isError && (
          <p className="mt-3 text-sm text-destructive">Failed to delete issue.</p>
        )}

        <div className="mt-6">
          {isEditing ? (
            <EditTaskForm
              boardId={task.column?.boardId ?? 0}
              task={task}
              members={
                members?.map((member) => ({
                  id: member.user.id,
                  email: member.user.email,
                })) ?? []
              }
              onCancel={() => setIsEditing(false)}
              onSaved={() => setIsEditing(false)}
            />
          ) : (
            <TaskDetails task={task} />
          )}
        </div>
        <CommentsSection taskId={task.id} members={members ?? []} />
        <AttachmentsSection taskId={task.id} members={members ?? []} />
        <ActivitySection taskId={task.id} />
      </div>
    </main>
  );
}

export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const taskId = Number(params.id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm text-destructive">Invalid issue ID.</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <TaskContent taskId={taskId} />
    </ProtectedRoute>
  );
}
