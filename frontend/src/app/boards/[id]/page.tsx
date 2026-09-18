'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { BoardColumnManager } from '@/components/boards/board-column-manager';
import { BoardTaskCard } from '@/components/boards/board-task-card';
import { CreateTaskForm } from '@/components/boards/create-task-form';
import { useBoard } from '@/hooks/boards/use-board';
import { useProject } from '@/hooks/projects/use-project';
import { useProjectMembers } from '@/hooks/projects/use-project-members';

function BoardContent({ boardId }: { boardId: number }) {
  const { data: board, isPending, isError } = useBoard(boardId);
  const { data: project } = useProject(board?.projectId ?? 0);
  const { data: members } = useProjectMembers(board?.projectId ?? 0);

  if (isPending) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-slate-500">Loading board...</p>
        </div>
      </main>
    );
  }

  if (isError || !board) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/projects"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to projects
          </Link>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-900">
              Board not found
            </h1>

            <p className="mt-2 text-sm text-red-700">
              The board may not exist or you may not have access to it.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/projects/${board.projectId}`}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to project
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold tracking-wide text-slate-500">
            BOARD
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {board.name}
          </h1>
        </div>

        <div>
          <CreateTaskForm
            boardId={board.id}
            projectId={board.projectId}
            columns={board.columns}
            members={
              members?.map((member) => ({
                id: member.user.id,
                email: member.user.email,
              })) ?? []
            }
          />
        </div>

        <div className="mt-8 overflow-x-auto">
          <div className="grid min-w-225 grid-cols-4 gap-4">
            {board.columns
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((column) => (
                <section
                  key={column.id}
                  className="min-h-96 rounded-2xl bg-slate-100 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold text-slate-950">
                      {column.name}
                    </h2>

                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                      {column._count.tasks}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {column.tasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                        <p className="text-sm text-slate-500">No issues yet</p>
                      </div>
                    ) : (
                      column.tasks
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((task) => (
                          <BoardTaskCard key={task.id} task={task} />
                        ))
                    )}
                  </div>
                </section>
              ))}
          </div>
        </div>

        {(project?.role === 'OWNER' || project?.role === 'ADMIN') && (
          <BoardColumnManager boardId={board.id} columns={board.columns} />
        )}
      </div>
    </main>
  );
}

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const boardId = Number(params.id);

  if (!Number.isInteger(boardId) || boardId <= 0) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen px-6 py-12">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm text-red-600">Invalid board ID.</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <BoardContent boardId={boardId} />
    </ProtectedRoute>
  );
}
