'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import { useAppSelector } from '@/store/hooks';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ProjectLabelRealtimePayload {
  id: number;
  projectId: number;
}

export function useProjectRealtime(projectId: number) {
  const queryClient = useQueryClient();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!accessToken || !Number.isInteger(projectId) || projectId <= 0) {
      return;
    }

    const socket: Socket = io(API_URL, {
      auth: {
        token: accessToken,
      },
    });

    const refreshLabels = (label: ProjectLabelRealtimePayload) => {
      if (label.projectId !== projectId) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ['labels', 'projects', projectId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['labels', 'tasks'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks'],
      });
    };

    socket.on('connect', () => {
      socket.emit('join-project', projectId);
    });

    socket.on('label.created', refreshLabels);
    socket.on('label.updated', refreshLabels);
    socket.on('label.deleted', refreshLabels);

    return () => {
      socket.off('label.created', refreshLabels);
      socket.off('label.updated', refreshLabels);
      socket.off('label.deleted', refreshLabels);
      socket.disconnect();
    };
  }, [accessToken, projectId, queryClient]);
}
