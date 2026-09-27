import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDeleteTask = vi.hoisted(() => vi.fn());

vi.mock('@/lib/tasks', () => ({
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
}));

import { useDeleteTask } from '@/hooks/tasks/use-delete-task';

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

describe('useDeleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the task and invalidates related queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockDeleteTask.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTask(20, 42), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync();

    expect(mockDeleteTask).toHaveBeenCalledTimes(1);
    expect(mockDeleteTask).toHaveBeenCalledWith(42);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['boards', 20],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks'],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects'],
    });
  });

  it('propagates delete errors without invalidating queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockDeleteTask.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useDeleteTask(20, 42), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow('Delete failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
