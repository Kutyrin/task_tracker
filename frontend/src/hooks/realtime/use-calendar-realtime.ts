'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import { useAppSelector } from '@/store/hooks';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useCalendarRealtime(projectIds: number[]) {
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

    const invalidateCalendar = () => {
      void queryClient.invalidateQueries({
        queryKey: ['tasks', 'calendar'],
      });
    };

    const joinProjects = () => {
      for (const projectId of projectIds) {
        if (Number.isInteger(projectId) && projectId > 0) {
          socket.emit('join-project', projectId);
        }
      }
    };

    socket.on('connect', joinProjects);

    socket.on('task.created', invalidateCalendar);
    socket.on('task.updated', invalidateCalendar);
    socket.on('task.moved', invalidateCalendar);
    socket.on('task.deleted', invalidateCalendar);

    return () => {
      socket.off('connect', joinProjects);

      socket.off('task.created', invalidateCalendar);
      socket.off('task.updated', invalidateCalendar);
      socket.off('task.moved', invalidateCalendar);
      socket.off('task.deleted', invalidateCalendar);

      socket.disconnect();
    };
  }, [accessToken, projectIds, queryClient]);
}
