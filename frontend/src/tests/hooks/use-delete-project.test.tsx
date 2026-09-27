import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDeleteProject = vi.hoisted(() => vi.fn());

vi.mock('@/lib/projects', () => ({
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
}));

import { useDeleteProject } from '@/hooks/projects/use-delete-project';

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

describe('useDeleteProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a project, removes its exact cache and invalidates project queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

    mockDeleteProject.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(10);

    expect(mockDeleteProject).toHaveBeenCalledTimes(1);
    expect(mockDeleteProject).toHaveBeenCalledWith(10);

    expect(removeQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects', 10],
      exact: true,
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects'],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects', 'stats'],
    });
  });

  it('propagates project deletion errors without touching the cache', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

    mockDeleteProject.mockRejectedValue(new Error('Delete project failed'));

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync(10)).rejects.toThrow(
      'Delete project failed',
    );

    expect(removeQueriesSpy).not.toHaveBeenCalled();
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
