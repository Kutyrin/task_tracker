'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import type { Notification } from '@/lib/notifications';
import { notificationsQueryKey } from './use-notifications';
import { useAppSelector } from '@/store/hooks';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface TaskDeletedNotificationEvent {
  taskId: number;
  projectId: number;
}

export function useNotificationsRealtime() {
  const queryClient = useQueryClient();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const socket: Socket = io(API_URL, {
      auth: {
        token: accessToken,
      },
    });

    const handleNotificationCreated = (notification: Notification) => {
      queryClient.setQueryData(
        notificationsQueryKey,
        (
          current:
            | {
                data: Notification[];
                unreadCount: number;
              }
            | undefined,
        ) => {
          if (!current) {
            return {
              data: [notification],
              unreadCount: 1,
            };
          }

          if (current.data.some((item) => item.id === notification.id)) {
            return current;
          }

          return {
            data: [notification, ...current.data].slice(0, 50),
            unreadCount: current.unreadCount + 1,
          };
        },
      );
    };

    const handleTaskDeleted = ({ taskId }: TaskDeletedNotificationEvent) => {
      queryClient.setQueryData(
        notificationsQueryKey,
        (
          current:
            | {
                data: Notification[];
                unreadCount: number;
              }
            | undefined,
        ) => {
          if (!current) {
            return current;
          }

          const removedNotifications = current.data.filter(
            (notification) => notification.taskId === taskId,
          );

          if (removedNotifications.length === 0) {
            return current;
          }

          const removedUnreadCount = removedNotifications.filter(
            (notification) => notification.readAt === null,
          ).length;

          return {
            data: current.data.filter(
              (notification) => notification.taskId !== taskId,
            ),
            unreadCount: Math.max(0, current.unreadCount - removedUnreadCount),
          };
        },
      );
    };

    socket.on('notification.created', handleNotificationCreated);
    socket.on('notification.task.deleted', handleTaskDeleted);

    return () => {
      socket.off('notification.created', handleNotificationCreated);
      socket.off('notification.task.deleted', handleTaskDeleted);
      socket.disconnect();
    };
  }, [accessToken, queryClient]);
}
