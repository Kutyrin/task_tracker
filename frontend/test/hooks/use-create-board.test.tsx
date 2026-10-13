import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateBoard = vi.hoisted(() => vi.fn());

vi.mock('@/lib/boards', () => ({
  createBoard: (...args: unknown[]) => mockCreateBoard(...args),
}));

import { useCreateBoard } from '@/hooks/projects/use-create-board';

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

describe('useCreateBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a board with the project id and invalidates related project queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockCreateBoard.mockResolvedValue({
      id: 20,
      name: 'Main board',
      projectId: 10,
    });

    const { result } = renderHook(() => useCreateBoard(10), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      name: 'Main board',
    });

    expect(mockCreateBoard).toHaveBeenCalledTimes(1);
    expect(mockCreateBoard).toHaveBeenCalledWith({
      projectId: 10,
      name: 'Main board',
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects', 10, 'boards'],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projects', 10],
    });
  });

  it('propagates board creation errors without invalidating queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockCreateBoard.mockRejectedValue(new Error('Create board failed'));

    const { result } = renderHook(() => useCreateBoard(10), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        name: 'Broken board',
      }),
    ).rejects.toThrow('Create board failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
