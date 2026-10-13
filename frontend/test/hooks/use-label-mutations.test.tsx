import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateLabel = vi.hoisted(() => vi.fn());
const mockUpdateLabel = vi.hoisted(() => vi.fn());
const mockDeleteLabel = vi.hoisted(() => vi.fn());
const mockAssignLabelToTask = vi.hoisted(() => vi.fn());
const mockRemoveLabelFromTask = vi.hoisted(() => vi.fn());

vi.mock('@/lib/labels', () => ({
  createLabel: (...args: unknown[]) => mockCreateLabel(...args),
  updateLabel: (...args: unknown[]) => mockUpdateLabel(...args),
  deleteLabel: (...args: unknown[]) => mockDeleteLabel(...args),
  assignLabelToTask: (...args: unknown[]) => mockAssignLabelToTask(...args),
  removeLabelFromTask: (...args: unknown[]) => mockRemoveLabelFromTask(...args),
}));

import { useAssignLabel } from '@/hooks/labels/use-assign-label';
import { useCreateLabel } from '@/hooks/labels/use-create-label';
import { useDeleteLabel } from '@/hooks/labels/use-delete-label';
import { useRemoveLabel } from '@/hooks/labels/use-remove-label';
import { useUpdateLabel } from '@/hooks/labels/use-update-label';

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

describe('label mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a label and invalidates project labels', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      name: 'Frontend',
    };

    mockCreateLabel.mockResolvedValue({
      id: 5,
      name: 'Frontend',
      projectId: 10,
    });

    const { result } = renderHook(() => useCreateLabel(10), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(payload);

    expect(mockCreateLabel).toHaveBeenCalledWith(10, payload);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['labels', 'projects', 10],
    });
  });

  it('does not invalidate project labels when create fails', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockCreateLabel.mockRejectedValue(new Error('Create label failed'));

    const { result } = renderHook(() => useCreateLabel(10), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({ name: 'Frontend' }),
    ).rejects.toThrow('Create label failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('updates a label and invalidates project, task-label and task queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      name: 'Backend',
    };

    mockUpdateLabel.mockResolvedValue({
      id: 5,
      name: 'Backend',
      projectId: 10,
    });

    const { result } = renderHook(() => useUpdateLabel(10, 5), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(payload);

    expect(mockUpdateLabel).toHaveBeenCalledWith(10, 5, payload);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['labels', 'projects', 10],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['labels', 'tasks'],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks'],
    });
  });

  it('does not invalidate queries when update fails', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockUpdateLabel.mockRejectedValue(new Error('Update label failed'));

    const { result } = renderHook(() => useUpdateLabel(10, 5), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({ name: 'Backend' }),
    ).rejects.toThrow('Update label failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('deletes a label and invalidates project, task-label and task queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockDeleteLabel.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteLabel(10, 5), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync();

    expect(mockDeleteLabel).toHaveBeenCalledWith(10, 5);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['labels', 'projects', 10],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['labels', 'tasks'],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks'],
    });
  });

  it('does not invalidate queries when delete fails', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockDeleteLabel.mockRejectedValue(new Error('Delete label failed'));

    const { result } = renderHook(() => useDeleteLabel(10, 5), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow(
      'Delete label failed',
    );

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('assigns a label to a task and invalidates task label queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      labelId: 5,
    };

    mockAssignLabelToTask.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAssignLabel(42), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(payload);

    expect(mockAssignLabelToTask).toHaveBeenCalledWith(42, payload);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['labels', 'tasks', 42],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks', 42],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks'],
    });
  });

  it('does not invalidate queries when label assignment fails', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockAssignLabelToTask.mockRejectedValue(new Error('Assign label failed'));

    const { result } = renderHook(() => useAssignLabel(42), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync({ labelId: 5 })).rejects.toThrow(
      'Assign label failed',
    );

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('removes a label from a task and invalidates task label queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockRemoveLabelFromTask.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveLabel(42, 5), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync();

    expect(mockRemoveLabelFromTask).toHaveBeenCalledWith(42, 5);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['labels', 'tasks', 42],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks', 42],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['tasks'],
    });
  });

  it('does not invalidate queries when label removal fails', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockRemoveLabelFromTask.mockRejectedValue(new Error('Remove label failed'));

    const { result } = renderHook(() => useRemoveLabel(42, 5), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow(
      'Remove label failed',
    );

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
