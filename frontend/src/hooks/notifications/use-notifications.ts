'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
  type NotificationsResponse,
} from '@/lib/notifications';

export const notificationsQueryKey = ['notifications'];

export function useNotifications() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: getNotifications,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (notification) => {
      queryClient.setQueryData<NotificationsResponse>(
        notificationsQueryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            data: current.data.map((item) =>
              item.id === notification.id ? notification : item,
            ),
            unreadCount: current.data.some(
              (item) => item.id === notification.id && item.readAt === null,
            )
              ? Math.max(0, current.unreadCount - 1)
              : current.unreadCount,
          };
        },
      );
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.setQueryData<NotificationsResponse>(
        notificationsQueryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            data: current.data.map((notification): Notification => ({
              ...notification,
              readAt: notification.readAt ?? new Date().toISOString(),
            })),
            unreadCount: 0,
          };
        },
      );
    },
  });
}
