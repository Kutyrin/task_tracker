'use client';

import { useDndContext, useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  BoardTaskCard,
  BoardTaskCardOverlay,
} from '@/components/boards/board-task-card';
import type { BoardDetailsColumn } from '@/lib/boards';
import type { Task } from '@/lib/tasks';

interface BoardTaskColumnProps {
  column: BoardDetailsColumn;
  disableTaskDrag?: boolean;
  hasActiveFilters?: boolean;
  sortTasksByPosition?: boolean;
}

function getTaskId(id: string | number | undefined) {
  if (typeof id !== 'string' || !id.startsWith('task-')) {
    return null;
  }

  const taskId = Number(id.replace('task-', ''));

  return Number.isInteger(taskId) ? taskId : null;
}

function getColumnDropId(id: string | number | undefined) {
  if (typeof id !== 'string' || !id.startsWith('column-drop-')) {
    return null;
  }

  const columnId = Number(id.replace('column-drop-', ''));

  return Number.isInteger(columnId) ? columnId : null;
}

function TaskDropPlaceholder({ task }: { task: Task }) {
  return (
    <div className="pointer-events-none opacity-40">
      <BoardTaskCardOverlay task={task} />
    </div>
  );
}

export function BoardTaskColumn({
  column,
  disableTaskDrag = false,
  hasActiveFilters = false,
  sortTasksByPosition = true,
}: BoardTaskColumnProps) {
  const { active, over } = useDndContext();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      columnId: column.id,
      column,
    },
  });

  const { setNodeRef: setTaskDropRef, isOver } = useDroppable({
    id: `column-drop-${column.id}`,
    data: {
      type: 'task-column',
      columnId: column.id,
    },
  });

  const sortedTasks = sortTasksByPosition
    ? column.tasks.slice().sort((a, b) => a.position - b.position)
    : column.tasks;

  const activeType = active?.data.current?.type;

  const activeTask =
    activeType === 'task'
      ? ((active?.data.current?.task as Task | undefined) ?? null)
      : null;

  const activeTaskId = activeTask?.id ?? null;
  const sourceColumnId = activeTask?.columnId ?? null;

  const overTaskId = getTaskId(over?.id);
  const overColumnDropId = getColumnDropId(over?.id);

  const isTaskDrag = activeType === 'task' && activeTaskId !== null;

  const isCrossColumnTaskDrag =
    isTaskDrag && sourceColumnId !== null && sourceColumnId !== column.id;

  const isTaskTargetColumn =
    overTaskId !== null
      ? column.tasks.some((task) => task.id === overTaskId)
      : overColumnDropId === column.id;

  const activeRect = active?.rect.current.translated;
  const overRect = over?.rect;

  let insertAfter = false;

  if (overTaskId !== null && activeRect && overRect) {
    insertAfter = activeRect.top > overRect.top + overRect.height / 2;
  }

  const showTaskPlaceholder =
    isCrossColumnTaskDrag && isTaskTargetColumn && activeTask !== null;

  const showTaskPlaceholderAtEnd = showTaskPlaceholder && overTaskId === null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`min-w-0 rounded-2xl bg-slate-100 p-4 ${
        isDragging ? 'z-20 opacity-30 shadow-xl' : ''
      }`}
    >
      <div
        {...listeners}
        className="touch-none cursor-grab rounded-lg active:cursor-grabbing"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-950">{column.name}</h2>

          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {column._count.tasks}
          </span>
        </div>
      </div>

      <div
        ref={setTaskDropRef}
        className={`mt-4 min-h-72 rounded-xl transition ${
          isOver && activeType === 'task' ? 'bg-slate-200/70' : ''
        }`}
      >
        <SortableContext
          items={sortedTasks.map((task) => `task-${task.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {sortedTasks.length === 0 ? (
            showTaskPlaceholder ? (
              <TaskDropPlaceholder task={activeTask} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <p className="text-sm text-slate-500">
                  {hasActiveFilters ? 'No matching issues' : 'No issues yet'}
                </p>
              </div>
            )
          ) : (
            sortedTasks.map((task) => {
              const showPlaceholderBefore =
                showTaskPlaceholder && overTaskId === task.id && !insertAfter;

              const showPlaceholderAfter =
                showTaskPlaceholder && overTaskId === task.id && insertAfter;

              return (
                <div key={task.id}>
                  {showPlaceholderBefore && (
                    <TaskDropPlaceholder task={activeTask} />
                  )}

                  <BoardTaskCard task={task} disableDrag={disableTaskDrag} />

                  {showPlaceholderAfter && (
                    <TaskDropPlaceholder task={activeTask} />
                  )}
                </div>
              );
            })
          )}

          {showTaskPlaceholderAtEnd && sortedTasks.length > 0 && (
            <TaskDropPlaceholder task={activeTask} />
          )}
        </SortableContext>
      </div>
    </section>
  );
}
