import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Attachment } from '@/lib/attachments';
import type { Comment } from '@/lib/comments';
import type { TaskLabel } from '@/lib/labels';
import type { Task } from '@/lib/tasks';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type EventHandler = (...args: unknown[]) => void;

const mockIo = vi.hoisted(() => vi.fn());
const mockUseAppSelector = vi.hoisted(() => vi.fn());

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

vi.mock('@/store/hooks', () => ({
  useAppSelector: (selector: unknown) => mockUseAppSelector(selector),
}));

import { useBoardRealtime } from '@/hooks/realtime/use-board-realtime';
import { useCalendarRealtime } from '@/hooks/realtime/use-calendar-realtime';
import { useDashboardRealtime } from '@/hooks/realtime/use-dashboard-realtime';
import { useProjectRealtime } from '@/hooks/realtime/use-project-realtime';
import { useTaskRealtime } from '@/hooks/realtime/use-task-realtime';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
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

function createSocketMock() {
  const handlers = new Map<string, EventHandler>();

  const socket = {
    on: vi.fn((event: string, handler: EventHandler) => {
      handlers.set(event, handler);
      return socket;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    socket,
    handlers,
  };
}

function createTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    title: 'Prepare release',
    description: null,
    issueNumber: 7,
    issueKey: 'TASK-7',
    issueType: 'TASK',
    priority: 'MEDIUM',
    dueDate: null,
    position: 1000,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    userId: 1,
    reporterId: 1,
    assigneeId: null,
    projectId: 10,
    columnId: 1,
    project: null,
    column: {
      id: 1,
      name: 'To Do',
      position: 1000,
      boardId: 20,
    },
    reporter: null,
    assignee: null,
    labels: [],
    ...overrides,
  };
}

function createBoard() {
  const firstTask = createTask();

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
          tasks: 1,
        },
        tasks: [firstTask],
      },
      {
        id: 2,
        name: 'In Progress',
        position: 2000,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        boardId: 20,
        _count: {
          tasks: 0,
        },
        tasks: [],
      },
    ],
  };
}

describe('realtime hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppSelector.mockReturnValue('access-token');
  });

  it('joins the board project and updates matching tasks', () => {
    const queryClient = createQueryClient();
    const { socket, handlers } = createSocketMock();
    const board = createBoard();

    mockIo.mockReturnValue(socket);

    queryClient.setQueryData(['boards', 20], board);

    renderHook(() => useBoardRealtime(20, 10), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('connect')?.();

    expect(socket.emit).toHaveBeenCalledWith('join-project', 10);

    const movedTask = createTask({
      columnId: 2,
      position: 500,
      column: {
        id: 2,
        name: 'In Progress',
        position: 2000,
        boardId: 20,
      },
    });

    handlers.get('task.moved')?.(movedTask);

    const updatedBoard = queryClient.getQueryData<
      ReturnType<typeof createBoard>
    >(['boards', 20]);

    expect(updatedBoard).toBeDefined();
    expect(updatedBoard!.columns[0].tasks).toHaveLength(0);
    expect(updatedBoard!.columns[1].tasks).toEqual([movedTask]);
    expect(updatedBoard!.columns[0]._count.tasks).toBe(0);
    expect(updatedBoard!.columns[1]._count.tasks).toBe(1);

    handlers.get('task.updated')?.(
      createTask({
        id: 99,
        projectId: 999,
        columnId: 1,
      }),
    );

    expect(
      queryClient.getQueryData<ReturnType<typeof createBoard>>(['boards', 20]),
    ).toEqual(updatedBoard);
  });

  it('updates board task labels and removes deleted tasks', () => {
    const queryClient = createQueryClient();
    const { socket, handlers } = createSocketMock();

    mockIo.mockReturnValue(socket);
    queryClient.setQueryData(['boards', 20], createBoard());

    renderHook(() => useBoardRealtime(20, 10), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('label.added')?.({
      id: 5,
      name: 'Frontend',
      taskId: 42,
    });

    let board = queryClient.getQueryData<ReturnType<typeof createBoard>>([
      'boards',
      20,
    ]);

    expect(board).toBeDefined();
    expect(board!.columns[0].tasks[0].labels).toEqual([
      {
        id: 5,
        name: 'Frontend',
      },
    ]);

    handlers.get('label.removed')?.({
      id: 5,
      name: 'Frontend',
      taskId: 42,
    });

    board = queryClient.getQueryData<ReturnType<typeof createBoard>>([
      'boards',
      20,
    ]);

    expect(board).toBeDefined();
    expect(board!.columns[0].tasks[0].labels).toEqual([]);

    handlers.get('task.deleted')?.({
      taskId: 42,
    });

    board = queryClient.getQueryData<ReturnType<typeof createBoard>>([
      'boards',
      20,
    ]);

    expect(board!.columns[0].tasks).toHaveLength(0);
    expect(board!.columns[0]._count.tasks).toBe(0);
  });

  it('does not connect to a board realtime channel with invalid input', () => {
    const queryClient = createQueryClient();
    const { socket } = createSocketMock();

    mockIo.mockReturnValue(socket);
    mockUseAppSelector.mockReturnValue(null);

    renderHook(() => useBoardRealtime(0, 10), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockIo).not.toHaveBeenCalled();
  });

  it('joins valid calendar projects and invalidates calendar queries on task events', async () => {
    const queryClient = createQueryClient();
    const { socket, handlers } = createSocketMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockIo.mockReturnValue(socket);

    renderHook(() => useCalendarRealtime([10, 0, -1, 20, Number.NaN]), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('connect')?.();

    expect(socket.emit).toHaveBeenCalledTimes(2);
    expect(socket.emit).toHaveBeenCalledWith('join-project', 10);
    expect(socket.emit).toHaveBeenCalledWith('join-project', 20);

    handlers.get('task.updated')?.();

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks', 'calendar'],
    });
  });

  it('invalidates dashboard stats and projects for realtime events', () => {
    const queryClient = createQueryClient();
    const { socket, handlers } = createSocketMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockIo.mockReturnValue(socket);

    renderHook(() => useDashboardRealtime([10, 20]), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('connect')?.();

    expect(socket.emit).toHaveBeenCalledWith('join-project', 10);
    expect(socket.emit).toHaveBeenCalledWith('join-project', 20);

    handlers.get('task.created')?.();

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects', 'stats'],
    });

    handlers.get('project.created')?.();

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects'],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects', 'stats'],
    });
  });

  it('filters project label events and adds unique activities', () => {
    const queryClient = createQueryClient();
    const { socket, handlers } = createSocketMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockIo.mockReturnValue(socket);

    queryClient.setQueryData(
      ['activities', 'projects', 10],
      [
        {
          id: 1,
          type: 'TASK_CREATED',
        },
      ],
    );

    renderHook(() => useProjectRealtime(10), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('connect')?.();

    expect(socket.emit).toHaveBeenCalledWith('join-project', 10);

    handlers.get('label.updated')?.({
      id: 5,
      projectId: 99,
    });

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();

    handlers.get('label.updated')?.({
      id: 5,
      projectId: 10,
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['labels', 'projects', 10],
    });

    const activity = {
      id: 2,
      type: 'TASK_UPDATED',
    };

    handlers.get('activity.created')?.(activity);
    handlers.get('activity.created')?.(activity);

    expect(
      queryClient.getQueryData<Array<{ id: number; type: string }>>([
        'activities',
        'projects',
        10,
      ]),
    ).toEqual([
      activity,
      {
        id: 1,
        type: 'TASK_CREATED',
      },
    ]);
  });

  it('updates comments through task realtime events', () => {
    const queryClient = createQueryClient();
    const { socket, handlers } = createSocketMock();

    mockIo.mockReturnValue(socket);

    const firstComment = {
      id: 1,
      content: 'First',
      taskId: 42,
    };

    queryClient.setQueryData(['comments', 42], [firstComment]);

    renderHook(() => useTaskRealtime(42, 10), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('comment.created')?.({
      id: 2,
      content: 'Second',
      taskId: 42,
    });

    expect(
      queryClient.getQueryData<
        Array<Pick<Comment, 'id' | 'content' | 'taskId'>>
      >(['comments', 42]),
    ).toEqual([
      firstComment,
      {
        id: 2,
        content: 'Second',
        taskId: 42,
      },
    ]);

    handlers.get('comment.updated')?.({
      id: 1,
      content: 'Updated',
      taskId: 42,
    });

    expect(
      queryClient.getQueryData<
        Array<Pick<Comment, 'id' | 'content' | 'taskId'>>
      >(['comments', 42]),
    ).toEqual([
      {
        id: 1,
        content: 'Updated',
        taskId: 42,
      },
      {
        id: 2,
        content: 'Second',
        taskId: 42,
      },
    ]);

    handlers.get('comment.deleted')?.({
      commentId: 2,
    });

    expect(
      queryClient.getQueryData<
        Array<Pick<Comment, 'id' | 'content' | 'taskId'>>
      >(['comments', 42]),
    ).toEqual([
      {
        id: 1,
        content: 'Updated',
        taskId: 42,
      },
    ]);
  });

  it('updates task labels and attachments through task realtime events', () => {
    const queryClient = createQueryClient();
    const { socket, handlers } = createSocketMock();

    mockIo.mockReturnValue(socket);

    queryClient.setQueryData(['labels', 'tasks', 42], []);
    queryClient.setQueryData(
      ['attachments', 42],
      [
        {
          id: 1,
          filename: 'old.txt',
        },
      ],
    );
    queryClient.setQueryData(['tasks', 42], {
      ...createTask(),
      labels: [],
    });

    renderHook(() => useTaskRealtime(42, 10), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('label.added')?.({
      id: 5,
      name: 'Frontend',
      taskId: 42,
    });

    expect(
      queryClient.getQueryData<TaskLabel[]>(['labels', 'tasks', 42]),
    ).toHaveLength(1);

    const updatedTask = queryClient.getQueryData<Task>(['tasks', 42]);

    expect(updatedTask).toBeDefined();
    expect(updatedTask!.labels).toEqual([
      {
        id: 5,
        name: 'Frontend',
      },
    ]);

    handlers.get('attachment.uploaded')?.({
      id: 2,
      filename: 'new.txt',
      taskId: 42,
    });

    expect(queryClient.getQueryData<Attachment[]>(['attachments', 42])).toEqual(
      [
        {
          id: 2,
          filename: 'new.txt',
          taskId: 42,
        },
        {
          id: 1,
          filename: 'old.txt',
        },
      ],
    );

    handlers.get('attachment.deleted')?.({
      id: 2,
      taskId: 42,
    });

    expect(queryClient.getQueryData<Attachment[]>(['attachments', 42])).toEqual(
      [
        {
          id: 1,
          filename: 'old.txt',
        },
      ],
    );
  });

  it('removes task caches and calls onTaskDeleted for the matching task', () => {
    const queryClient = createQueryClient();
    const { socket, handlers } = createSocketMock();
    const onTaskDeleted = vi.fn();

    mockIo.mockReturnValue(socket);

    queryClient.setQueryData(['tasks', 42], createTask());
    queryClient.setQueryData(['labels', 'tasks', 42], []);
    queryClient.setQueryData(['attachments', 42], []);

    renderHook(() => useTaskRealtime(42, 10, onTaskDeleted), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('task.deleted')?.({
      taskId: 42,
    });

    expect(queryClient.getQueryData(['tasks', 42])).toBeUndefined();

    expect(queryClient.getQueryData(['labels', 'tasks', 42])).toBeUndefined();

    expect(queryClient.getQueryData(['attachments', 42])).toBeUndefined();

    expect(onTaskDeleted).toHaveBeenCalledTimes(1);
  });

  it('joins task and project channels and disconnects on unmount', () => {
    const queryClient = createQueryClient();
    const { socket, handlers } = createSocketMock();

    mockIo.mockReturnValue(socket);

    const { unmount } = renderHook(() => useTaskRealtime(42, 10), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('connect')?.();

    expect(socket.emit).toHaveBeenCalledWith('join-task', 42);
    expect(socket.emit).toHaveBeenCalledWith('join-project', 10);

    unmount();

    expect(socket.off).toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
