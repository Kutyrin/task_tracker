import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateProject = vi.hoisted(() => vi.fn());

vi.mock('@/lib/projects', () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

import { useCreateProject } from '@/hooks/projects/use-create-project';

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

describe('useCreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes project data to createProject and invalidates projects', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      name: 'Task Tracker',
      key: 'TRACK',
    };

    mockCreateProject.mockResolvedValue({
      id: 10,
      ...payload,
    });

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(payload);

    expect(mockCreateProject).toHaveBeenCalledTimes(1);
    expect(mockCreateProject.mock.calls[0][0]).toEqual(payload);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects'],
    });
  });

  it('propagates create errors without invalidating projects', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockCreateProject.mockRejectedValue(new Error('Create failed'));

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        name: 'Broken project',
        key: 'BROKEN',
      }),
    ).rejects.toThrow('Create failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
