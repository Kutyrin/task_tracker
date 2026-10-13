import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetBoard = vi.hoisted(() => vi.fn());
const mockGetProject = vi.hoisted(() => vi.fn());
const mockGetProjectBoards = vi.hoisted(() => vi.fn());
const mockGetProjectMembers = vi.hoisted(() => vi.fn());
const mockGetProjects = vi.hoisted(() => vi.fn());
const mockGetTasks = vi.hoisted(() => vi.fn());
const mockGetTask = vi.hoisted(() => vi.fn());

vi.mock('@/lib/boards', () => ({
  getBoard: (...args: unknown[]) => mockGetBoard(...args),
  getProjectBoards: (...args: unknown[]) => mockGetProjectBoards(...args),
}));

vi.mock('@/lib/projects', () => ({
  getProject: (...args: unknown[]) => mockGetProject(...args),
  getProjectMembers: (...args: unknown[]) => mockGetProjectMembers(...args),
  getProjects: (...args: unknown[]) => mockGetProjects(...args),
}));

vi.mock('@/lib/tasks', () => ({
  getTasks: (...args: unknown[]) => mockGetTasks(...args),
  getTask: (...args: unknown[]) => mockGetTask(...args),
}));

import { useBoard } from '@/hooks/boards/use-board';
import { useProject } from '@/hooks/projects/use-project';
import { useProjectBoards } from '@/hooks/projects/use-project-boards';
import { useProjectMembers } from '@/hooks/projects/use-project-members';
import { useProjects } from '@/hooks/projects/use-projects';
import { useTask } from '@/hooks/tasks/use-task';
import { useTasks } from '@/hooks/tasks/use-tasks';

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

describe('query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a board by id', async () => {
    const queryClient = createQueryClient();
    const board = {
      id: 20,
      name: 'Main board',
    };

    mockGetBoard.mockResolvedValue(board);

    const { result } = renderHook(() => useBoard(20), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(board);
    });

    expect(mockGetBoard).toHaveBeenCalledWith(20);
    expect(queryClient.getQueryData(['boards', 20])).toEqual(board);
  });

  it('does not fetch a board for an invalid id', async () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useBoard(0), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetBoard).not.toHaveBeenCalled();
  });

  it('fetches a project by id', async () => {
    const queryClient = createQueryClient();
    const project = {
      id: 10,
      name: 'Task Tracker',
    };

    mockGetProject.mockResolvedValue(project);

    const { result } = renderHook(() => useProject(10), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(project);
    });

    expect(mockGetProject).toHaveBeenCalledWith(10);
    expect(queryClient.getQueryData(['projects', 10])).toEqual(project);
  });

  it('does not fetch a project for an invalid id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useProject(-1), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetProject).not.toHaveBeenCalled();
  });

  it('fetches boards for a project', async () => {
    const queryClient = createQueryClient();
    const boards = [
      {
        id: 20,
        name: 'Main board',
      },
    ];

    mockGetProjectBoards.mockResolvedValue(boards);

    const { result } = renderHook(() => useProjectBoards(10), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(boards);
    });

    expect(mockGetProjectBoards).toHaveBeenCalledWith(10);
    expect(queryClient.getQueryData(['projects', 10, 'boards'])).toEqual(
      boards,
    );
  });

  it('does not fetch project boards for an invalid project id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useProjectBoards(0), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetProjectBoards).not.toHaveBeenCalled();
  });

  it('fetches project members', async () => {
    const queryClient = createQueryClient();
    const members = [
      {
        id: 7,
        role: 'MEMBER',
      },
    ];

    mockGetProjectMembers.mockResolvedValue(members);

    const { result } = renderHook(() => useProjectMembers(10), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(members);
    });

    expect(mockGetProjectMembers).toHaveBeenCalledWith(10);
    expect(queryClient.getQueryData(['projects', 10, 'members'])).toEqual(
      members,
    );
  });

  it('does not fetch project members for an invalid project id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useProjectMembers(0), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetProjectMembers).not.toHaveBeenCalled();
  });

  it('fetches all projects', async () => {
    const queryClient = createQueryClient();
    const projects = [
      {
        id: 10,
        name: 'Task Tracker',
      },
    ];

    mockGetProjects.mockResolvedValue(projects);

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(projects);
    });

    expect(mockGetProjects).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['projects'])).toEqual(projects);
  });

  it('fetches tasks with query parameters', async () => {
    const queryClient = createQueryClient();
    const params = {
      page: 2,
      limit: 20,
      columnId: 2,
      priority: 'HIGH' as const,
      search: 'frontend',
      sortBy: 'priority' as const,
      sortOrder: 'desc' as const,
    };

    const response = {
      data: [],
      meta: {
        page: 2,
        limit: 20,
        total: 0,
        totalPages: 0,
        sortBy: 'priority' as const,
        sortOrder: 'desc' as const,
      },
    };

    mockGetTasks.mockResolvedValue(response);

    const { result } = renderHook(() => useTasks(params), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(response);
    });

    expect(mockGetTasks).toHaveBeenCalledWith(params);
    expect(queryClient.getQueryData(['tasks', params])).toEqual(response);
  });

  it('fetches tasks without parameters', async () => {
    const queryClient = createQueryClient();
    const response = {
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      },
    };

    mockGetTasks.mockResolvedValue(response);

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(response);
    });

    expect(mockGetTasks).toHaveBeenCalledWith(undefined);
  });

  it('fetches a task by id', async () => {
    const queryClient = createQueryClient();
    const task = {
      id: 42,
      title: 'Prepare release',
    };

    mockGetTask.mockResolvedValue(task);

    const { result } = renderHook(() => useTask(42), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(task);
    });

    expect(mockGetTask).toHaveBeenCalledWith(42);
    expect(queryClient.getQueryData(['tasks', 42])).toEqual(task);
  });

  it('does not fetch a task for an invalid id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useTask(-1), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetTask).not.toHaveBeenCalled();
  });
});
