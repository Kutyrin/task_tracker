import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpdateTask = vi.hoisted(() => vi.fn());

vi.mock('@/lib/tasks', () => ({
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
}));

import { useUpdateTask } from '@/hooks/tasks/use-update-task';

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

describe('useUpdateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes task id and data to updateTask and invalidates related queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const updatedTask = {
      id: 42,
      projectId: 10,
    };

    mockUpdateTask.mockResolvedValue(updatedTask);

    const { result } = renderHook(() => useUpdateTask(20, 42), {
      wrapper: createWrapper(queryClient),
    });

    const payload = {
      title: 'Updated title',
      description: 'Updated description',
      priority: 'HIGH' as const,
      assigneeId: 7,
    };

    await result.current.mutateAsync(payload);

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask).toHaveBeenCalledWith(42, payload);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks', 42],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['boards', 20],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects', 10],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks'],
    });
  });

  it('propagates updateTask errors without invalidating queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockUpdateTask.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateTask(20, 42), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        title: 'Broken update',
      }),
    ).rejects.toThrow('Update failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
