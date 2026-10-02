'use client';

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { BoardTaskCardOverlay } from '@/components/boards/board-task-card';
import { BoardTaskColumn } from '@/components/boards/board-task-column';
import { BoardColumnManager } from '@/components/boards/board-column-manager';
import { BoardTaskFilters } from '@/components/boards/board-task-filters';
import { useBoardRealtime } from '@/hooks/realtime/use-board-realtime';
import { useProjectLabels } from '@/hooks/labels/use-project-labels';
import { CreateTaskForm } from '@/components/boards/create-task-form';
import { useBoard } from '@/hooks/boards/use-board';
import { useMoveColumn } from '@/hooks/boards/use-move-column';
import { useProject } from '@/hooks/projects/use-project';
import { useProjectMembers } from '@/hooks/projects/use-project-members';
import { useMoveTask } from '@/hooks/tasks/use-move-task';
import type { SortOrder, Task, TaskSortBy } from '@/lib/tasks';

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

function calculateColumnPosition(
  columns: {
    id: number;
    position: number;
  }[],
  activeColumnId: number,
  overColumnId: number,
) {
  const orderedColumns = [...columns].sort((a, b) => a.position - b.position);

  const activeIndex = orderedColumns.findIndex(
    (column) => column.id === activeColumnId,
  );

  const overIndex = orderedColumns.findIndex(
    (column) => column.id === overColumnId,
  );

  if (activeIndex === -1 || overIndex === -1) {
    return null;
  }

  const reorderedColumns = [...orderedColumns];
  const [movedColumn] = reorderedColumns.splice(activeIndex, 1);

  if (!movedColumn) {
    return null;
  }

  reorderedColumns.splice(overIndex, 0, movedColumn);

  const newIndex = reorderedColumns.findIndex(
    (column) => column.id === activeColumnId,
  );

  const previousColumn = reorderedColumns[newIndex - 1];
  const nextColumn = reorderedColumns[newIndex + 1];

  if (!previousColumn && nextColumn) {
    return nextColumn.position - 1000;
  }

  if (previousColumn && !nextColumn) {
    return previousColumn.position + 1000;
  }

  if (previousColumn && nextColumn) {
    return (
      previousColumn.position +
      (nextColumn.position - previousColumn.position) / 2
    );
  }

  return 1000;
}

const collisionDetectionStrategy: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type;

  if (activeType === 'column') {
    const columnContainers = args.droppableContainers.filter(
      (container) => container.data.current?.type === 'column',
    );

    return closestCorners({
      ...args,
      droppableContainers: columnContainers,
    });
  }

  if (activeType === 'task') {
    const taskContainers = args.droppableContainers.filter((container) => {
      const type = container.data.current?.type;

      return type === 'task' || type === 'task-column';
    });

    return closestCorners({
      ...args,
      droppableContainers: taskContainers,
    });
  }

  return closestCorners(args);
};

function getTaskId(id: string | number) {
  if (typeof id !== 'string' || !id.startsWith('task-')) {
    return null;
  }

  const taskId = Number(id.replace('task-', ''));

  return Number.isInteger(taskId) ? taskId : null;
}

function getColumnId(id: string | number) {
  if (typeof id !== 'string' || !id.startsWith('column-')) {
    return null;
  }

  const columnId = Number(id.replace('column-', ''));

  return Number.isInteger(columnId) ? columnId : null;
}

function BoardColumnDragOverlay({
  name,
  tasksCount,
}: {
  name: string;
  tasksCount: number;
}) {
  return (
    <div className="w-64 rounded-2xl bg-slate-100 p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{name}</h2>

        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          {tasksCount}
        </span>
      </div>
    </div>
  );
}

function compareTasks(first: Task, second: Task, sortBy: TaskSortBy): number {
  switch (sortBy) {
    case 'priority': {
      const priorityOrder: Record<Task['priority'], number> = {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
      };

      return priorityOrder[first.priority] - priorityOrder[second.priority];
    }

    case 'createdAt':
      return (
        new Date(first.createdAt).getTime() -
        new Date(second.createdAt).getTime()
      );

    case 'updatedAt':
      return (
        new Date(first.updatedAt).getTime() -
        new Date(second.updatedAt).getTime()
      );

    case 'dueDate': {
      if (!first.dueDate && !second.dueDate) {
        return 0;
      }

      if (!first.dueDate) {
        return 1;
      }

      if (!second.dueDate) {
        return -1;
      }

      return (
        new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime()
      );
    }

    case 'title':
      return first.title.localeCompare(second.title);

    case 'position':
    default:
      return first.position - second.position;
  }
}

function BoardContent({ boardId }: { boardId: number }) {
  const { data: board, isPending, isError } = useBoard(boardId);
  const { data: project } = useProject(board?.projectId ?? 0);
  const { data: members } = useProjectMembers(board?.projectId ?? 0);
  const { data: labels } = useProjectLabels(board?.projectId ?? 0);

  useBoardRealtime(boardId, board?.projectId ?? null);

  const moveTaskMutation = useMoveTask(boardId);
  const moveColumnMutation = useMoveColumn(boardId);

  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const [activeColumnId, setActiveColumnId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [filterColumnId, setFilterColumnId] = useState<number | null>(null);
  const [filterIssueType, setFilterIssueType] = useState<
    'ALL' | Task['issueType']
  >('ALL');
  const [filterPriority, setFilterPriority] = useState<
    'ALL' | Task['priority']
  >('ALL');
  const [filterAssigneeId, setFilterAssigneeId] = useState<
    number | 'UNASSIGNED' | null
  >(null);
  const [filterLabelId, setFilterLabelId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<TaskSortBy>('position');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const hasActiveFilters =
    search.trim() !== '' ||
    filterColumnId !== null ||
    filterIssueType !== 'ALL' ||
    filterPriority !== 'ALL' ||
    filterAssigneeId !== null ||
    filterLabelId !== null;

  const isTaskDragDisabled =
    hasActiveFilters || sortBy !== 'position' || sortOrder !== 'asc';

  const filteredColumns = useMemo(() => {
    if (!board) {
      return [];
    }

    const normalizedSearch = search.trim().toLowerCase();

    return board.columns.map((column) => {
      const tasks = column.tasks.filter((task) => {
        const matchesSearch =
          normalizedSearch === '' ||
          [task.issueKey, task.title, task.description].some((value) =>
            value?.toLowerCase().includes(normalizedSearch),
          );

        const matchesColumn =
          filterColumnId === null || column.id === filterColumnId;

        const matchesIssueType =
          filterIssueType === 'ALL' || task.issueType === filterIssueType;

        const matchesPriority =
          filterPriority === 'ALL' || task.priority === filterPriority;

        const matchesAssignee =
          filterAssigneeId === null ||
          (filterAssigneeId === 'UNASSIGNED'
            ? task.assigneeId === null
            : task.assigneeId === filterAssigneeId);

        const matchesLabel =
          filterLabelId === null ||
          task.labels.some((label) => label.id === filterLabelId);

        return (
          matchesSearch &&
          matchesColumn &&
          matchesIssueType &&
          matchesPriority &&
          matchesAssignee &&
          matchesLabel
        );
      });

      const sortedTasks = tasks.slice().sort((first, second) => {
        const result = compareTasks(first, second, sortBy);

        if (result !== 0) {
          return sortOrder === 'asc' ? result : -result;
        }

        return first.id - second.id;
      });

      return {
        ...column,
        tasks: sortedTasks,
        _count: {
          ...column._count,
          tasks: sortedTasks.length,
        },
      };
    });
  }, [
    board,
    filterAssigneeId,
    filterColumnId,
    filterIssueType,
    filterLabelId,
    filterPriority,
    search,
    sortBy,
    sortOrder,
  ]);

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

  const activeColumn = activeColumnId
    ? board?.columns.find((column) => column.id === activeColumnId)
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
    const type = event.active.data.current?.type;

    if (type === 'task') {
      const taskId = getTaskId(event.active.id);

      if (taskId !== null) {
        setActiveTaskId(taskId);
      }

      return;
    }

    if (type === 'column') {
      const columnId = getColumnId(event.active.id);

      if (columnId !== null) {
        setActiveColumnId(columnId);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
    setActiveColumnId(null);
  };

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeTaskId = getTaskId(active.id);

    if (activeTaskId === null) {
      return;
    }

    const sourceColumn = board.columns.find((column) =>
      column.tasks.some((task) => task.id === activeTaskId),
    );

    if (!sourceColumn) {
      return;
    }

    const overTaskId = getTaskId(over.id);

    const overColumnId =
      typeof over.id === 'string' && over.id.startsWith('column-drop-')
        ? Number(over.id.replace('column-drop-', ''))
        : null;

    let targetColumnId: number;
    let targetTaskId: number | null = null;

    if (overTaskId !== null) {
      targetTaskId = overTaskId;

      const targetColumn = board.columns.find((column) =>
        column.tasks.some((task) => task.id === overTaskId),
      );

      if (!targetColumn) {
        return;
      }

      targetColumnId = targetColumn.id;
    } else if (overColumnId !== null && Number.isInteger(overColumnId)) {
      targetColumnId = overColumnId;
    } else {
      return;
    }

    const targetColumn = board.columns.find(
      (column) => column.id === targetColumnId,
    );

    if (!targetColumn) {
      return;
    }

    let insertAfter = false;

    if (targetTaskId !== null) {
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
          (task) => task.id === targetTaskId,
        );

        insertAfter = sourceIndex <= overIndex;
      } else {
        const activeRect = active.rect.current.translated;
        const overRect = over.rect;

        insertAfter =
          activeRect !== null &&
          overRect !== undefined &&
          activeRect.top > overRect.top + overRect.height / 2;
      }
    }

    const position = calculateTaskPosition(
      targetColumn.tasks,
      activeTaskId,
      targetTaskId,
      insertAfter,
    );

    moveTaskMutation.mutate({
      taskId: activeTaskId,
      data: {
        columnId: targetColumnId,
        position,
      },
    });
  };

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeColumnId = getColumnId(active.id);
    const overColumnId = getColumnId(over.id);

    if (activeColumnId === null || overColumnId === null) {
      return;
    }

    if (activeColumnId === overColumnId) {
      return;
    }

    const position = calculateColumnPosition(
      board.columns,
      activeColumnId,
      overColumnId,
    );

    if (position === null) {
      return;
    }

    moveColumnMutation.mutate({
      columnId: activeColumnId,
      position,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const type = event.active.data.current?.type;

    if (type === 'task') {
      handleTaskDragEnd(event);
    } else if (type === 'column') {
      handleColumnDragEnd(event);
    }

    setActiveTaskId(null);
    setActiveColumnId(null);
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

        <div>
          <BoardTaskFilters
            search={search}
            columnId={filterColumnId}
            issueType={filterIssueType}
            priority={filterPriority}
            assigneeId={filterAssigneeId}
            labelId={filterLabelId}
            columns={board.columns
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((column) => ({
                id: column.id,
                name: column.name,
              }))}
            members={
              members?.map((member) => ({
                id: member.user.id,
                email: member.user.email,
              })) ?? []
            }
            labels={
              labels?.map((label) => ({
                id: label.id,
                name: label.name,
              })) ?? []
            }
            onSearchChange={setSearch}
            onColumnChange={setFilterColumnId}
            onIssueTypeChange={setFilterIssueType}
            onPriorityChange={setFilterPriority}
            onAssigneeChange={setFilterAssigneeId}
            onLabelChange={setFilterLabelId}
            onReset={() => {
              setSearch('');
              setFilterColumnId(null);
              setFilterIssueType('ALL');
              setFilterPriority('ALL');
              setFilterAssigneeId(null);
              setFilterLabelId(null);
              setSortBy('position');
              setSortOrder('asc');
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortByChange={setSortBy}
            onSortOrderChange={setSortOrder}
          />
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="mt-8 overflow-x-auto">
            <SortableContext
              items={board.columns
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((column) => `column-${column.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="grid min-w-225 grid-cols-4 gap-4">
                {filteredColumns
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((column) => (
                    <BoardTaskColumn
                      key={column.id}
                      column={column}
                      disableTaskDrag={isTaskDragDisabled}
                      hasActiveFilters={hasActiveFilters}
                      sortTasksByPosition={sortBy === 'position'}
                    />
                  ))}
              </div>
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <BoardTaskCardOverlay task={activeTask} />
            ) : activeColumn ? (
              <BoardColumnDragOverlay
                name={activeColumn.name}
                tasksCount={activeColumn._count.tasks}
              />
            ) : null}
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
