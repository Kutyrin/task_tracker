import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMarkNotificationAsRead = vi.hoisted(() => vi.fn());
const mockMarkAllNotificationsAsRead = vi.hoisted(() => vi.fn());
const mockIo = vi.hoisted(() => vi.fn());
const mockUseAppSelector = vi.hoisted(() => vi.fn());

vi.mock('@/lib/notifications', () => ({
  markNotificationAsRead: (...args: unknown[]) =>
    mockMarkNotificationAsRead(...args),
  markAllNotificationsAsRead: (...args: unknown[]) =>
    mockMarkAllNotificationsAsRead(...args),
}));

vi.mock('@/store/hooks', () => ({
  useAppSelector: (selector: unknown) => mockUseAppSelector(selector),
}));

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

import {
  notificationsQueryKey,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from '@/hooks/notifications/use-notifications';
import { useNotificationsRealtime } from '@/hooks/notifications/use-notifications-realtime';
import type { Notification, NotificationsResponse } from '@/lib/notifications';

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

function createNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 1,
    type: 'TASK_ASSIGNED',
    message: 'You were assigned a task',
    createdAt: '2026-09-20T10:00:00.000Z',
    readAt: null,
    userId: 1,
    taskId: 42,
    projectId: 10,
    task: null,
    project: null,
    ...overrides,
  };
}

describe('notification hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppSelector.mockReturnValue('access-token');
  });

  it('marks an unread notification as read and decrements unreadCount', async () => {
    const queryClient = createQueryClient();

    const currentNotification = createNotification({
      id: 1,
      readAt: null,
    });

    const updatedNotification = createNotification({
      id: 1,
      readAt: '2026-09-21T12:00:00.000Z',
    });

    const current: NotificationsResponse = {
      data: [currentNotification],
      unreadCount: 3,
    };

    queryClient.setQueryData(notificationsQueryKey, current);
    mockMarkNotificationAsRead.mockResolvedValue(updatedNotification);

    const { result } = renderHook(() => useMarkNotificationAsRead(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(1);

    expect(mockMarkNotificationAsRead.mock.calls[0][0]).toBe(1);

    expect(queryClient.getQueryData(notificationsQueryKey)).toEqual({
      data: [updatedNotification],
      unreadCount: 2,
    });
  });

  it('does not decrement unreadCount when the notification was already read', async () => {
    const queryClient = createQueryClient();

    const currentNotification = createNotification({
      id: 1,
      readAt: '2026-09-20T11:00:00.000Z',
    });

    const updatedNotification = createNotification({
      id: 1,
      readAt: '2026-09-21T12:00:00.000Z',
    });

    queryClient.setQueryData(notificationsQueryKey, {
      data: [currentNotification],
      unreadCount: 3,
    });

    mockMarkNotificationAsRead.mockResolvedValue(updatedNotification);

    const { result } = renderHook(() => useMarkNotificationAsRead(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(1);

    expect(queryClient.getQueryData(notificationsQueryKey)).toEqual({
      data: [updatedNotification],
      unreadCount: 3,
    });
  });

  it('marks all notifications as read and sets unreadCount to zero', async () => {
    const queryClient = createQueryClient();

    queryClient.setQueryData<NotificationsResponse>(notificationsQueryKey, {
      data: [
        createNotification({ id: 1, readAt: null }),
        createNotification({ id: 2, readAt: '2026-09-20T11:00:00.000Z' }),
      ],
      unreadCount: 1,
    });

    mockMarkAllNotificationsAsRead.mockResolvedValue({
      updatedCount: 1,
    });

    const before = Date.now();

    const { result } = renderHook(() => useMarkAllNotificationsAsRead(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync();

    const after = Date.now();
    const updated = queryClient.getQueryData<NotificationsResponse>(
      notificationsQueryKey,
    );

    expect(mockMarkAllNotificationsAsRead).toHaveBeenCalledTimes(1);
    expect(updated?.unreadCount).toBe(0);
    expect(updated?.data[1].readAt).toBe('2026-09-20T11:00:00.000Z');

    const newReadAt = updated?.data[0].readAt;
    expect(newReadAt).not.toBeNull();

    const timestamp = newReadAt ? Date.parse(newReadAt) : NaN;
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('starts realtime updates only when an access token exists', () => {
    const queryClient = createQueryClient();
    mockUseAppSelector.mockReturnValue(null);

    renderHook(() => useNotificationsRealtime(), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockIo).not.toHaveBeenCalled();
  });

  it('handles notification.created and avoids duplicate notifications', async () => {
    const queryClient = createQueryClient();
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const socket = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
        return socket;
      }),
      off: vi.fn(),
      disconnect: vi.fn(),
    };

    mockIo.mockReturnValue(socket);

    queryClient.setQueryData<NotificationsResponse>(notificationsQueryKey, {
      data: [createNotification({ id: 1 })],
      unreadCount: 1,
    });

    const { unmount } = renderHook(() => useNotificationsRealtime(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(mockIo).toHaveBeenCalledWith(expect.any(String), {
        auth: {
          token: 'access-token',
        },
      });
    });

    const createdNotification = createNotification({
      id: 2,
      message: 'New comment',
      type: 'COMMENT_ADDED',
    });

    handlers.get('notification.created')?.(createdNotification);

    expect(queryClient.getQueryData(notificationsQueryKey)).toEqual({
      data: [createdNotification, createNotification({ id: 1 })],
      unreadCount: 2,
    });

    handlers.get('notification.created')?.(createdNotification);

    expect(queryClient.getQueryData(notificationsQueryKey)).toEqual({
      data: [createdNotification, createNotification({ id: 1 })],
      unreadCount: 2,
    });

    unmount();
  });

  it('limits realtime-created notifications to the latest 50 items', () => {
    const queryClient = createQueryClient();
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const socket = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
        return socket;
      }),
      off: vi.fn(),
      disconnect: vi.fn(),
    };

    mockIo.mockReturnValue(socket);

    const existingNotifications = Array.from({ length: 50 }, (_, index) =>
      createNotification({ id: index + 1 }),
    );

    queryClient.setQueryData<NotificationsResponse>(notificationsQueryKey, {
      data: existingNotifications,
      unreadCount: 50,
    });

    renderHook(() => useNotificationsRealtime(), {
      wrapper: createWrapper(queryClient),
    });

    const newNotification = createNotification({
      id: 100,
    });

    handlers.get('notification.created')?.(newNotification);

    const updated = queryClient.getQueryData<NotificationsResponse>(
      notificationsQueryKey,
    );

    expect(updated?.data).toHaveLength(50);
    expect(updated?.data[0]).toEqual(newNotification);
    expect(updated?.data.some((item) => item.id === 51)).toBe(false);
    expect(updated?.unreadCount).toBe(51);
  });

  it('removes task notifications and adjusts unreadCount after task deletion', () => {
    const queryClient = createQueryClient();
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const socket = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
        return socket;
      }),
      off: vi.fn(),
      disconnect: vi.fn(),
    };

    mockIo.mockReturnValue(socket);

    queryClient.setQueryData<NotificationsResponse>(notificationsQueryKey, {
      data: [
        createNotification({
          id: 1,
          taskId: 42,
          readAt: null,
        }),
        createNotification({
          id: 2,
          taskId: 42,
          readAt: '2026-09-20T11:00:00.000Z',
        }),
        createNotification({
          id: 3,
          taskId: 99,
          readAt: null,
        }),
      ],
      unreadCount: 2,
    });

    renderHook(() => useNotificationsRealtime(), {
      wrapper: createWrapper(queryClient),
    });

    handlers.get('notification.task.deleted')?.({
      taskId: 42,
      projectId: 10,
    });

    expect(queryClient.getQueryData(notificationsQueryKey)).toEqual({
      data: [createNotification({ id: 3, taskId: 99, readAt: null })],
      unreadCount: 1,
    });
  });

  it('cleans up realtime socket listeners and connection on unmount', () => {
    const queryClient = createQueryClient();
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const socket = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
        return socket;
      }),
      off: vi.fn(),
      disconnect: vi.fn(),
    };

    mockIo.mockReturnValue(socket);

    const { unmount } = renderHook(() => useNotificationsRealtime(), {
      wrapper: createWrapper(queryClient),
    });

    unmount();

    expect(socket.off).toHaveBeenCalledWith(
      'notification.created',
      handlers.get('notification.created'),
    );

    expect(socket.off).toHaveBeenCalledWith(
      'notification.task.deleted',
      handlers.get('notification.task.deleted'),
    );

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
