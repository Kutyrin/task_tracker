'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { BoardTaskCard } from '@/components/boards/board-task-card';
import type { BoardDetailsColumn } from '@/lib/boards';

interface BoardTaskColumnProps {
  column: BoardDetailsColumn;
}

export function BoardTaskColumn({ column }: BoardTaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      columnId: column.id,
    },
  });

  const sortedTasks = column.tasks
    .slice()
    .sort((a, b) => a.position - b.position);

  return (
    <section
      className={`min-h-96 rounded-2xl p-4 transition ${
        isOver ? 'bg-slate-200' : 'bg-slate-100'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{column.name}</h2>

        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          {column._count.tasks}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="mt-4 min-h-72 space-y-3 rounded-xl transition"
      >
        <SortableContext
          items={sortedTasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-sm text-slate-500">No issues yet</p>
            </div>
          ) : (
            sortedTasks.map((task) => (
              <BoardTaskCard key={task.id} task={task} />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
