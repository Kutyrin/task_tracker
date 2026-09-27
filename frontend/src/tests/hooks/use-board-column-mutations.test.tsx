import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateColumn = vi.hoisted(() => vi.fn());
const mockUpdateColumn = vi.hoisted(() => vi.fn());
const mockDeleteColumn = vi.hoisted(() => vi.fn());
const mockMoveColumn = vi.hoisted(() => vi.fn());

vi.mock('@/lib/boards', () => ({
  createColumn: (...args: unknown[]) => mockCreateColumn(...args),
  updateColumn: (...args: unknown[]) => mockUpdateColumn(...args),
  deleteColumn: (...args: unknown[]) => mockDeleteColumn(...args),
  moveColumn: (...args: unknown[]) => mockMoveColumn(...args),
}));

import type { BoardDetails } from '@/lib/boards';
import { useCreateColumn } from '@/hooks/boards/use-create-column';
import { useDeleteColumn } from '@/hooks/boards/use-delete-column';
import { useMoveColumn } from '@/hooks/boards/use-move-column';
import { useUpdateColumn } from '@/hooks/boards/use-update-column';

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

function createBoard(): BoardDetails {
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
          tasks: 0,
        },
        tasks: [],
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
      {
        id: 3,
        name: 'Done',
        position: 3000,
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

describe('board column mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a column and invalidates the board', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockCreateColumn.mockResolvedValue({
      id: 4,
      name: 'Review',
      position: 4000,
    });

    const { result } = renderHook(() => useCreateColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync('Review');

    expect(mockCreateColumn).toHaveBeenCalledWith(20, {
      name: 'Review',
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['boards', 20],
    });
  });

  it('does not invalidate the board when column creation fails', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockCreateColumn.mockRejectedValue(new Error('Create column failed'));

    const { result } = renderHook(() => useCreateColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync('Review')).rejects.toThrow(
      'Create column failed',
    );

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('updates a column and invalidates the board', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockUpdateColumn.mockResolvedValue({
      id: 2,
      name: 'Doing',
      position: 2000,
    });

    const { result } = renderHook(() => useUpdateColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      columnId: 2,
      name: 'Doing',
    });

    expect(mockUpdateColumn).toHaveBeenCalledWith(20, 2, {
      name: 'Doing',
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['boards', 20],
    });
  });

  it('deletes a column and invalidates the board', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockDeleteColumn.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(3);

    expect(mockDeleteColumn).toHaveBeenCalledWith(20, 3);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['boards', 20],
    });
  });

  it('optimistically reorders columns and invalidates the board when move succeeds', async () => {
    const queryClient = createQueryClient();
    const board = createBoard();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    queryClient.setQueryData(['boards', 20], board);

    let resolveMutation!: (column: {
      id: number;
      name: string;
      position: number;
      updatedAt: string;
    }) => void;

    mockMoveColumn.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );

    const { result } = renderHook(() => useMoveColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    const mutationPromise = result.current.mutateAsync({
      columnId: 3,
      position: 1500,
    });

    await waitFor(() => {
      expect(mockMoveColumn).toHaveBeenCalledWith(20, 3, {
        position: 1500,
      });
    });

    const optimisticBoard = queryClient.getQueryData<BoardDetails>([
      'boards',
      20,
    ]);

    expect(optimisticBoard?.columns.map((column) => column.id)).toEqual([
      1, 3, 2,
    ]);
    expect(optimisticBoard?.columns[1].position).toBe(1500);

    resolveMutation({
      id: 3,
      name: 'Done',
      position: 1500,
      updatedAt: '2026-09-10T00:00:00.000Z',
    });

    await mutationPromise;

    const updatedBoard = queryClient.getQueryData<BoardDetails>(['boards', 20]);

    expect(updatedBoard?.columns.map((column) => column.id)).toEqual([1, 3, 2]);
    expect(updatedBoard?.columns[1].updatedAt).toBe('2026-09-10T00:00:00.000Z');

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['boards', 20],
      refetchType: 'none',
    });
  });

  it('restores the previous board when column move fails', async () => {
    const queryClient = createQueryClient();
    const board = createBoard();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    queryClient.setQueryData(['boards', 20], board);

    mockMoveColumn.mockRejectedValue(new Error('Move column failed'));

    const { result } = renderHook(() => useMoveColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        columnId: 3,
        position: 1500,
      }),
    ).rejects.toThrow('Move column failed');

    expect(queryClient.getQueryData<BoardDetails>(['boards', 20])).toEqual(
      board,
    );

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['boards', 20],
      refetchType: 'none',
    });
  });

  it('replaces the moved column with the server response', async () => {
    const queryClient = createQueryClient();
    const board = createBoard();

    queryClient.setQueryData(['boards', 20], board);

    mockMoveColumn.mockResolvedValue({
      id: 2,
      name: 'Doing',
      position: 500,
      updatedAt: '2026-09-11T00:00:00.000Z',
    });

    const { result } = renderHook(() => useMoveColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      columnId: 2,
      position: 500,
    });

    const updatedBoard = queryClient.getQueryData<BoardDetails>(['boards', 20]);

    expect(updatedBoard?.columns.map((column) => column.id)).toEqual([2, 1, 3]);
    expect(updatedBoard?.columns[0]).toMatchObject({
      id: 2,
      name: 'Doing',
      position: 500,
      updatedAt: '2026-09-11T00:00:00.000Z',
    });
  });

  it('keeps the board unchanged when moving an unknown column', async () => {
    const queryClient = createQueryClient();
    const board = createBoard();

    queryClient.setQueryData(['boards', 20], board);

    let resolveMutation!: (column: {
      id: number;
      name: string;
      position: number;
      updatedAt: string;
    }) => void;

    mockMoveColumn.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );

    const { result } = renderHook(() => useMoveColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    const mutationPromise = result.current.mutateAsync({
      columnId: 999,
      position: 1500,
    });

    await waitFor(() => {
      expect(mockMoveColumn).toHaveBeenCalled();
    });

    expect(queryClient.getQueryData<BoardDetails>(['boards', 20])).toEqual(
      board,
    );

    resolveMutation({
      id: 999,
      name: 'Unknown',
      position: 1500,
      updatedAt: '2026-09-11T00:00:00.000Z',
    });

    await mutationPromise;
  });

  it('propagates update and delete column errors', async () => {
    const queryClient = createQueryClient();

    mockUpdateColumn.mockRejectedValue(new Error('Update column failed'));
    mockDeleteColumn.mockRejectedValue(new Error('Delete column failed'));

    const { result: updateResult } = renderHook(() => useUpdateColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    const { result: deleteResult } = renderHook(() => useDeleteColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      updateResult.current.mutateAsync({
        columnId: 2,
        name: 'Broken',
      }),
    ).rejects.toThrow('Update column failed');

    await expect(deleteResult.current.mutateAsync(2)).rejects.toThrow(
      'Delete column failed',
    );
  });

  it('propagates update column API payload correctly', async () => {
    const queryClient = createQueryClient();

    mockUpdateColumn.mockResolvedValue({
      id: 2,
      name: 'In Review',
      position: 2000,
    });

    const { result } = renderHook(() => useUpdateColumn(20), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      columnId: 2,
      name: 'In Review',
    });

    expect(mockUpdateColumn).toHaveBeenCalledTimes(1);
    expect(mockUpdateColumn).toHaveBeenCalledWith(20, 2, {
      name: 'In Review',
    });
  });
});
