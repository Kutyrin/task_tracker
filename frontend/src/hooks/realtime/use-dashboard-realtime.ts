'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import { useAppSelector } from '@/store/hooks';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useDashboardRealtime(projectIds: number[]) {
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

    const invalidateStats = () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', 'stats'],
      });
    };

    const invalidateProjectsAndStats = () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects', 'stats'],
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

    socket.on('task.created', invalidateStats);
    socket.on('task.updated', invalidateStats);
    socket.on('task.moved', invalidateStats);
    socket.on('task.deleted', invalidateStats);

    socket.on('project.created', invalidateProjectsAndStats);
    socket.on('project.deleted', invalidateProjectsAndStats);
    socket.on('project.access.revoked', invalidateProjectsAndStats);

    return () => {
      socket.off('connect', joinProjects);

      socket.off('task.created', invalidateStats);
      socket.off('task.updated', invalidateStats);
      socket.off('task.moved', invalidateStats);
      socket.off('task.deleted', invalidateStats);

      socket.off('project.created', invalidateProjectsAndStats);
      socket.off('project.deleted', invalidateProjectsAndStats);
      socket.off('project.access.revoked', invalidateProjectsAndStats);

      socket.disconnect();
    };
  }, [accessToken, projectIds, queryClient]);
}
