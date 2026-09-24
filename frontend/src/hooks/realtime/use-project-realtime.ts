'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import type { Activity } from '@/lib/activities';
import { projectActivitiesQueryKey } from '@/hooks/activities/use-project-activities';
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

    const addActivity = (activity: Activity) => {
      queryClient.setQueryData<Activity[]>(
        projectActivitiesQueryKey(projectId),
        (currentActivities) => {
          if (!currentActivities) {
            return [activity];
          }

          if (
            currentActivities.some(
              (currentActivity) => currentActivity.id === activity.id,
            )
          ) {
            return currentActivities;
          }

          return [activity, ...currentActivities];
        },
      );
    };

    socket.on('connect', () => {
      socket.emit('join-project', projectId);
    });

    socket.on('label.created', refreshLabels);
    socket.on('label.updated', refreshLabels);
    socket.on('label.deleted', refreshLabels);
    socket.on('activity.created', addActivity);

    return () => {
      socket.off('label.created', refreshLabels);
      socket.off('label.updated', refreshLabels);
      socket.off('label.deleted', refreshLabels);
      socket.off('activity.created', addActivity);
      socket.disconnect();
    };
  }, [accessToken, projectId, queryClient]);
}
