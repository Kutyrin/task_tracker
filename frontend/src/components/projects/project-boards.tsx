import { Badge } from '@/components/ui/badge';
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
            className="block rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-input hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {board.name}
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {board.columns.length} columns
                </p>
              </div>

              <Badge variant="secondary">{taskCount} tasks</Badge>
            </div>

            <div className="mt-5 space-y-2">
              {board.columns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                >
                  <span className="text-sm text-foreground">{column.name}</span>

                  <span className="text-xs text-muted-foreground">
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
