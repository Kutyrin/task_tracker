import Link from 'next/link';

import type { Board } from '@/lib/boards';

interface ProjectBoardsProps {
  boards: Board[];
}

export function ProjectBoards({ boards }: ProjectBoardsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {boards.map((board) => {
        const taskCount = board.columns.reduce(
          (total, column) => total + column._count.tasks,
          0,
        );

        return (
          <Link
            key={board.id}
            href={`/boards/${board.id}`}
            className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  {board.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {board.columns.length} columns
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {taskCount} tasks
              </span>
            </div>

            <div className="mt-5 space-y-2">
              {board.columns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">{column.name}</span>

                  <span className="text-xs text-slate-500">
                    {column._count.tasks}
                  </span>
                </div>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
