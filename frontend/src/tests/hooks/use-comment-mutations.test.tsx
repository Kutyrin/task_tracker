import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateComment = vi.hoisted(() => vi.fn());
const mockUpdateComment = vi.hoisted(() => vi.fn());
const mockDeleteComment = vi.hoisted(() => vi.fn());

vi.mock('@/lib/comments', () => ({
  createComment: (...args: unknown[]) => mockCreateComment(...args),
  updateComment: (...args: unknown[]) => mockUpdateComment(...args),
  deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
}));

import { useCreateComment } from '@/hooks/comments/use-create-comment';
import { useDeleteComment } from '@/hooks/comments/use-delete-comment';
import { useUpdateComment } from '@/hooks/comments/use-update-comment';

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

describe('comment mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a comment and invalidates the task comments query', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      content: 'Looks good to me.',
    };

    const createdComment = {
      id: 10,
      ...payload,
      taskId: 42,
    };

    mockCreateComment.mockResolvedValue(createdComment);

    const { result } = renderHook(() => useCreateComment(42), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(payload);

    expect(mockCreateComment).toHaveBeenCalledTimes(1);
    expect(mockCreateComment).toHaveBeenCalledWith(42, payload);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['comments', 42],
    });
  });

  it('propagates create comment errors without invalidating comments', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockCreateComment.mockRejectedValue(new Error('Create comment failed'));

    const { result } = renderHook(() => useCreateComment(42), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        content: 'Broken comment',
      }),
    ).rejects.toThrow('Create comment failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('updates a comment and invalidates the task comments query', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      content: 'Updated comment.',
    };

    mockUpdateComment.mockResolvedValue({
      id: 10,
      ...payload,
      taskId: 42,
    });

    const { result } = renderHook(() => useUpdateComment(42, 10), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(payload);

    expect(mockUpdateComment).toHaveBeenCalledTimes(1);
    expect(mockUpdateComment).toHaveBeenCalledWith(42, 10, payload);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['comments', 42],
    });
  });

  it('propagates update comment errors without invalidating comments', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockUpdateComment.mockRejectedValue(new Error('Update comment failed'));

    const { result } = renderHook(() => useUpdateComment(42, 10), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        content: 'Broken update',
      }),
    ).rejects.toThrow('Update comment failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('deletes a comment and invalidates the task comments query', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockDeleteComment.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteComment(42, 10), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync();

    expect(mockDeleteComment).toHaveBeenCalledTimes(1);
    expect(mockDeleteComment).toHaveBeenCalledWith(42, 10);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['comments', 42],
    });
  });

  it('propagates delete comment errors without invalidating comments', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockDeleteComment.mockRejectedValue(new Error('Delete comment failed'));

    const { result } = renderHook(() => useDeleteComment(42, 10), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow(
      'Delete comment failed',
    );

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
