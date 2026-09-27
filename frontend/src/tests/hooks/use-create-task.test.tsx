import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateTask = vi.hoisted(() => vi.fn());

vi.mock('@/lib/tasks', () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
}));

import { useCreateTask } from '@/hooks/tasks/use-create-task';

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

describe('useCreateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes task data to createTask and invalidates related queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const createdTask = {
      id: 42,
      projectId: 10,
    };

    mockCreateTask.mockResolvedValue(createdTask);

    const { result } = renderHook(() => useCreateTask(20), {
      wrapper: createWrapper(queryClient),
    });

    const payload = {
      title: 'Implement search',
      description: 'Add task search',
      issueType: 'TASK' as const,
      priority: 'HIGH' as const,
      projectId: 10,
      columnId: 2,
      assigneeId: 5,
    };

    await result.current.mutateAsync(payload);

    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateTask).toHaveBeenCalledWith(payload);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['boards', 20],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects', 10],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects'],
    });
  });

  it('propagates createTask errors without invalidating queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockCreateTask.mockRejectedValue(new Error('Create failed'));

    const { result } = renderHook(() => useCreateTask(20), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        title: 'Broken task',
        projectId: 10,
        columnId: 2,
      }),
    ).rejects.toThrow('Create failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
