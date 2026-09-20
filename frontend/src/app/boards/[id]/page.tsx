'use client';

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { BoardColumnManager } from '@/components/boards/board-column-manager';
import { BoardTaskCardOverlay } from '@/components/boards/board-task-card';
import { BoardTaskColumn } from '@/components/boards/board-task-column';
import { CreateTaskForm } from '@/components/boards/create-task-form';
import { useBoard } from '@/hooks/boards/use-board';
import { useProject } from '@/hooks/projects/use-project';
import { useProjectMembers } from '@/hooks/projects/use-project-members';
import { useMoveTask } from '@/hooks/tasks/use-move-task';
import type { Task } from '@/lib/tasks';

function calculateTaskPosition(
  tasks: Task[],
  activeTaskId: number,
  overTaskId: number | null,
  insertAfter = false,
) {
  const sortedTasks = tasks
    .filter((task) => task.id !== activeTaskId)
    .slice()
    .sort((a, b) => a.position - b.position);

  if (overTaskId === null) {
    const lastTask = sortedTasks.at(-1);

    return lastTask ? lastTask.position + 1000 : 1000;
  }

  const overIndex = sortedTasks.findIndex((task) => task.id === overTaskId);

  if (overIndex === -1) {
    const lastTask = sortedTasks.at(-1);

    return lastTask ? lastTask.position + 1000 : 1000;
  }

  const insertIndex = overIndex + (insertAfter ? 1 : 0);
  const previousTask = sortedTasks[insertIndex - 1];
  const nextTask = sortedTasks[insertIndex];

  if (!previousTask && nextTask) {
    return nextTask.position - 1000;
  }

  if (previousTask && !nextTask) {
    return previousTask.position + 1000;
  }

  if (previousTask && nextTask) {
    return (previousTask.position + nextTask.position) / 2;
  }

  return 1000;
}

function BoardContent({ boardId }: { boardId: number }) {
  const { data: board, isPending, isError } = useBoard(boardId);
  const { data: project } = useProject(board?.projectId ?? 0);
  const { data: members } = useProjectMembers(board?.projectId ?? 0);

  const moveTaskMutation = useMoveTask(boardId);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const activeTask = activeTaskId
    ? board?.columns
        .flatMap((column) => column.tasks)
        .find((task) => task.id === activeTaskId)
    : null;

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

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = Number(event.active.id);

    if (!Number.isInteger(taskId)) {
      return;
    }

    setActiveTaskId(taskId);
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeTaskId = Number(active.id);

    if (!Number.isInteger(activeTaskId)) {
      return;
    }

    const sourceColumn = board.columns.find((column) =>
      column.tasks.some((task) => task.id === activeTaskId),
    );

    if (!sourceColumn) {
      return;
    }

    const overId = over.id;

    let targetColumnId: number;
    let overTaskId: number | null = null;

    if (typeof overId === 'string' && overId.startsWith('column-')) {
      targetColumnId = Number(overId.replace('column-', ''));

      if (!Number.isInteger(targetColumnId)) {
        return;
      }
    } else {
      overTaskId = Number(overId);

      if (!Number.isInteger(overTaskId)) {
        return;
      }

      const targetColumn = board.columns.find((column) =>
        column.tasks.some((task) => task.id === overTaskId),
      );

      if (!targetColumn) {
        return;
      }

      targetColumnId = targetColumn.id;
    }

    const targetColumn = board.columns.find(
      (column) => column.id === targetColumnId,
    );

    if (!targetColumn) {
      return;
    }

    let insertAfter = false;

    if (overTaskId !== null) {
      if (sourceColumn.id === targetColumn.id) {
        const sourceTasks = sourceColumn.tasks
          .slice()
          .sort((a, b) => a.position - b.position);

        const targetTasks = targetColumn.tasks
          .filter((task) => task.id !== activeTaskId)
          .slice()
          .sort((a, b) => a.position - b.position);

        const sourceIndex = sourceTasks.findIndex(
          (task) => task.id === activeTaskId,
        );

        const overIndex = targetTasks.findIndex(
          (task) => task.id === overTaskId,
        );

        insertAfter = sourceIndex <= overIndex;
      } else {
        const activeRect = active.rect.current.translated;
        const overRect = over.rect;

        insertAfter =
          activeRect !== null &&
          activeRect.top > overRect.top + overRect.height / 2;
      }
    }

    const position = calculateTaskPosition(
      targetColumn.tasks,
      activeTaskId,
      overTaskId,
      insertAfter,
    );

    moveTaskMutation.mutate({
      taskId: activeTaskId,
      data: {
        columnId: targetColumnId,
        position,
      },
    });

    setActiveTaskId(null);
  };

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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="mt-8 overflow-x-auto">
            <div className="grid min-w-225 grid-cols-4 gap-4">
              {board.columns
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((column) => (
                  <BoardTaskColumn key={column.id} column={column} />
                ))}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? <BoardTaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>

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
