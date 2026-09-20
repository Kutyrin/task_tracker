'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { CommentsSection } from '@/components/tasks/comments-section';
import { EditTaskForm } from '@/components/tasks/edit-task-form';
import { TaskDetails } from '@/components/tasks/task-details';
import { ActivitySection } from '@/components/tasks/activity-section';
import { useTask } from '@/hooks/tasks/use-task';
import { useDeleteTask } from '@/hooks/tasks/use-delete-task';
import { useProjectMembers } from '@/hooks/projects/use-project-members';

function TaskContent({ taskId }: { taskId: number }) {
  const router = useRouter();
  const { data: task, isPending, isError } = useTask(taskId);
  const { data: members } = useProjectMembers(task?.projectId ?? 0);

  const [isEditing, setIsEditing] = useState(false);
  const deleteTaskMutation = useDeleteTask(task?.column?.boardId ?? 0, taskId);

  if (isPending) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-slate-500">Loading issue...</p>
        </div>
      </main>
    );
  }

  if (isError || !task) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/projects"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to projects
          </Link>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-900">
              Issue not found
            </h1>

            <p className="mt-2 text-sm text-red-700">
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
        <Link
          href={task.column ? `/boards/${task.column.boardId}` : '/projects'}
          className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          Back to board
        </Link>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsEditing((value) => !value)}
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {isEditing ? 'Close edit' : 'Edit issue'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteTaskMutation.isPending}
            className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete issue'}
          </button>
        </div>

        {deleteTaskMutation.isError && (
          <p className="mt-3 text-sm text-red-600">Failed to delete issue.</p>
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
        <CommentsSection
          taskId={task.id}
          projectId={task.projectId}
          members={members ?? []}
        />
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
            <p className="text-sm text-red-600">Invalid issue ID.</p>
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
