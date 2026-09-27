import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMoveTask = vi.hoisted(() => vi.fn());

vi.mock('@/lib/tasks', () => ({
  moveTask: (...args: unknown[]) => mockMoveTask(...args),
}));

import type { BoardDetails } from '@/lib/boards';
import type { Task } from '@/lib/tasks';
import { useMoveTask } from '@/hooks/tasks/use-move-task';

function createTask(
  overrides: Partial<Task> & Pick<Task, 'id' | 'columnId' | 'position'>,
): Task {
  return {
    id: overrides.id,
    title: overrides.title ?? `Task ${overrides.id}`,
    description: null,
    issueNumber: overrides.issueNumber ?? overrides.id,
    issueKey: overrides.issueKey ?? `TASK-${overrides.id}`,
    issueType: overrides.issueType ?? 'TASK',
    priority: overrides.priority ?? 'MEDIUM',
    dueDate: null,
    position: overrides.position,
    createdAt: overrides.createdAt ?? '2026-09-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-09-01T00:00:00.000Z',
    userId: overrides.userId ?? 1,
    reporterId: overrides.reporterId ?? 1,
    assigneeId: overrides.assigneeId ?? null,
    projectId: overrides.projectId ?? 10,
    columnId: overrides.columnId,
    project: null,
    column:
      overrides.column ??
      (overrides.columnId === null
        ? null
        : {
            id: overrides.columnId,
            name: overrides.columnId === 1 ? 'To Do' : 'In Progress',
            position: overrides.columnId * 1000,
            boardId: 20,
          }),
    reporter: null,
    assignee: null,
    labels: [],
  };
}

function createBoard(): BoardDetails {
  const todoTask = createTask({
    id: 42,
    columnId: 1,
    position: 1000,
  });

  const secondTodoTask = createTask({
    id: 43,
    columnId: 1,
    position: 3000,
  });

  const inProgressTask = createTask({
    id: 44,
    columnId: 2,
    position: 1000,
  });

  return {
    id: 20,
    name: 'Main board',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    projectId: 10,
    ownerId: 1,
    columns: [
      {
        id: 1,
        name: 'To Do',
        position: 1000,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        boardId: 20,
        _count: {
          tasks: 2,
        },
        tasks: [todoTask, secondTodoTask],
      },
      {
        id: 2,
        name: 'In Progress',
        position: 2000,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        boardId: 20,
        _count: {
          tasks: 1,
        },
        tasks: [inProgressTask],
      },
    ],
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useMoveTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('optimistically moves a task between columns and updates task counts', async () => {
    const queryClient = createQueryClient();
    const board = createBoard();

    queryClient.setQueryData(['boards', 20], board);

    let resolveMutation!: (task: Task) => void;

    mockMoveTask.mockImplementation(
      () =>
        new Promise<Task>((resolve) => {
          resolveMutation = resolve;
        }),
    );

    const { result } = renderHook(() => useMoveTask(20), {
      wrapper: createWrapper(queryClient),
    });

    const mutationPromise = result.current.mutateAsync({
      taskId: 42,
      data: {
        columnId: 2,
        position: 1500,
      },
    });

    await waitFor(() => {
      expect(mockMoveTask).toHaveBeenCalledWith(42, {
        columnId: 2,
        position: 1500,
      });
    });

    const optimisticBoard = queryClient.getQueryData<BoardDetails>([
      'boards',
      20,
    ]);

    expect(optimisticBoard?.columns[0].tasks).toHaveLength(1);
    expect(optimisticBoard?.columns[0]._count.tasks).toBe(1);

    expect(optimisticBoard?.columns[1].tasks.map((task) => task.id)).toEqual([
      44, 42,
    ]);
    expect(optimisticBoard?.columns[1].tasks[1]).toMatchObject({
      id: 42,
      columnId: 2,
      position: 1500,
    });
    expect(optimisticBoard?.columns[1]._count.tasks).toBe(2);

    resolveMutation(
      createTask({
        id: 42,
        columnId: 2,
        position: 1500,
        title: 'Updated task',
      }),
    );

    await mutationPromise;
  });

  it('optimistically reorders a task inside the same column', async () => {
    const queryClient = createQueryClient();
    const board = createBoard();

    queryClient.setQueryData(['boards', 20], board);

    let resolveMutation!: (task: Task) => void;

    mockMoveTask.mockImplementation(
      () =>
        new Promise<Task>((resolve) => {
          resolveMutation = resolve;
        }),
    );

    const { result } = renderHook(() => useMoveTask(20), {
      wrapper: createWrapper(queryClient),
    });

    const mutationPromise = result.current.mutateAsync({
      taskId: 42,
      data: {
        columnId: 1,
        position: 2500,
      },
    });

    await waitFor(() => {
      expect(mockMoveTask).toHaveBeenCalledWith(42, {
        columnId: 1,
        position: 2500,
      });
    });

    const optimisticBoard = queryClient.getQueryData<BoardDetails>([
      'boards',
      20,
    ]);

    expect(optimisticBoard?.columns[0].tasks.map((task) => task.id)).toEqual([
      42, 43,
    ]);
    expect(optimisticBoard?.columns[0].tasks[0].position).toBe(2500);
    expect(optimisticBoard?.columns[0]._count.tasks).toBe(2);

    resolveMutation(
      createTask({
        id: 42,
        columnId: 1,
        position: 2500,
      }),
    );

    await mutationPromise;
  });

  it('restores the previous board when the mutation fails', async () => {
    const queryClient = createQueryClient();
    const board = createBoard();

    queryClient.setQueryData(['boards', 20], board);

    mockMoveTask.mockRejectedValue(new Error('Move failed'));

    const { result } = renderHook(() => useMoveTask(20), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        taskId: 42,
        data: {
          columnId: 2,
          position: 1500,
        },
      }),
    ).rejects.toThrow('Move failed');

    expect(queryClient.getQueryData<BoardDetails>(['boards', 20])).toEqual(
      board,
    );
  });

  it('applies the server task to board and task caches and invalidates queries', async () => {
    const queryClient = createQueryClient();
    const board = createBoard();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    queryClient.setQueryData(['boards', 20], board);

    const serverTask = createTask({
      id: 42,
      columnId: 2,
      position: 1750,
      title: 'Server version',
    });

    mockMoveTask.mockResolvedValue(serverTask);

    const { result } = renderHook(() => useMoveTask(20), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      taskId: 42,
      data: {
        columnId: 2,
        position: 1750,
      },
    });

    const updatedBoard = queryClient.getQueryData<BoardDetails>(['boards', 20]);

    expect(updatedBoard?.columns[0].tasks.some((task) => task.id === 42)).toBe(
      false,
    );

    expect(
      updatedBoard?.columns[1].tasks.find((task) => task.id === 42),
    ).toMatchObject({
      id: 42,
      title: 'Server version',
      columnId: 2,
      position: 1750,
    });

    expect(queryClient.getQueryData(['tasks', 42])).toEqual(serverTask);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['boards', 20],
      refetchType: 'none',
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks', 42],
    });
  });
});
