import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAttachments = vi.hoisted(() => vi.fn());
const mockGetComments = vi.hoisted(() => vi.fn());
const mockGetProjectLabels = vi.hoisted(() => vi.fn());
const mockGetTaskLabels = vi.hoisted(() => vi.fn());
const mockGetNotifications = vi.hoisted(() => vi.fn());

vi.mock('@/lib/attachments', () => ({
  getAttachments: (...args: unknown[]) => mockGetAttachments(...args),
}));

vi.mock('@/lib/comments', () => ({
  getComments: (...args: unknown[]) => mockGetComments(...args),
}));

vi.mock('@/lib/labels', () => ({
  getProjectLabels: (...args: unknown[]) => mockGetProjectLabels(...args),
  getTaskLabels: (...args: unknown[]) => mockGetTaskLabels(...args),
}));

vi.mock('@/lib/notifications', () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
}));

import { useAttachments } from '@/hooks/attachments/use-attachments';
import { useComments } from '@/hooks/comments/use-comments';
import { useProjectLabels } from '@/hooks/labels/use-project-labels';
import { useTaskLabels } from '@/hooks/labels/use-task-labels';
import { useNotifications } from '@/hooks/notifications/use-notifications';

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

describe('remaining query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches attachments for a task', async () => {
    const queryClient = createQueryClient();
    const attachments = [
      {
        id: 1,
        filename: 'report.pdf',
      },
    ];

    mockGetAttachments.mockResolvedValue(attachments);

    const { result } = renderHook(() => useAttachments(42), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(attachments);
    });

    expect(mockGetAttachments).toHaveBeenCalledWith(42);
    expect(queryClient.getQueryData(['attachments', 42])).toEqual(attachments);
  });

  it('does not fetch attachments for an invalid task id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useAttachments(0), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetAttachments).not.toHaveBeenCalled();
  });

  it('fetches comments for a task', async () => {
    const queryClient = createQueryClient();
    const comments = [
      {
        id: 1,
        content: 'Looks good.',
        taskId: 42,
      },
    ];

    mockGetComments.mockResolvedValue(comments);

    const { result } = renderHook(() => useComments(42), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(comments);
    });

    expect(mockGetComments).toHaveBeenCalledWith(42);
    expect(queryClient.getQueryData(['comments', 42])).toEqual(comments);
  });

  it('does not fetch comments for an invalid task id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useComments(-1), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetComments).not.toHaveBeenCalled();
  });

  it('fetches labels for a project', async () => {
    const queryClient = createQueryClient();
    const labels = [
      {
        id: 5,
        name: 'Frontend',
        projectId: 10,
      },
    ];

    mockGetProjectLabels.mockResolvedValue(labels);

    const { result } = renderHook(() => useProjectLabels(10), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(labels);
    });

    expect(mockGetProjectLabels).toHaveBeenCalledWith(10);
    expect(queryClient.getQueryData(['labels', 'projects', 10])).toEqual(
      labels,
    );
  });

  it('does not fetch project labels for an invalid project id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useProjectLabels(0), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetProjectLabels).not.toHaveBeenCalled();
  });

  it('fetches labels for a task', async () => {
    const queryClient = createQueryClient();
    const labels = [
      {
        id: 5,
        name: 'Frontend',
        createdAt: '2026-09-01T00:00:00.000Z',
        projectId: 10,
      },
    ];

    mockGetTaskLabels.mockResolvedValue(labels);

    const { result } = renderHook(() => useTaskLabels(42), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(labels);
    });

    expect(mockGetTaskLabels).toHaveBeenCalledWith(42);
    expect(queryClient.getQueryData(['labels', 'tasks', 42])).toEqual(labels);
  });

  it('does not fetch task labels for an invalid task id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useTaskLabels(-1), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetTaskLabels).not.toHaveBeenCalled();
  });

  it('fetches notifications', async () => {
    const queryClient = createQueryClient();
    const notifications = {
      data: [
        {
          id: 1,
          message: 'New task assignment',
          readAt: null,
        },
      ],
      unreadCount: 1,
    };

    mockGetNotifications.mockResolvedValue(notifications);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(notifications);
    });

    expect(mockGetNotifications).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['notifications'])).toEqual(notifications);
  });
});
