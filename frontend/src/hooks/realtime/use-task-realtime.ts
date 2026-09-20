'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import type { Activity } from '@/lib/activities';
import type { Comment } from '@/lib/comments';
import { useAppSelector } from '@/store/hooks';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface DeletedCommentPayload {
  commentId: number;
}

interface ActivityCreatedPayload extends Activity {
  task?: {
    id: number;
    issueNumber: number | null;
    title: string;
    project: {
      key: string;
    } | null;
  };
}

interface TaskLabelRealtimePayload {
  id: number;
  name: string;
  taskId: number;
}

export function useTaskRealtime(taskId: number, projectId: number | null) {
  const queryClient = useQueryClient();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (
      !accessToken ||
      !Number.isInteger(taskId) ||
      taskId <= 0 ||
      !Number.isInteger(projectId) ||
      projectId === null ||
      projectId <= 0
    ) {
      return;
    }

    const socket: Socket = io(API_URL, {
      auth: {
        token: accessToken,
      },
    });

    const addComment = (comment: Comment) => {
      if (comment.taskId !== taskId) {
        return;
      }

      queryClient.setQueryData<Comment[]>(
        ['comments', taskId],
        (currentComments) => {
          if (!currentComments) {
            return [comment];
          }

          if (currentComments.some((item) => item.id === comment.id)) {
            return currentComments;
          }

          return [...currentComments, comment];
        },
      );
    };

    const updateComment = (comment: Comment) => {
      if (comment.taskId !== taskId) {
        return;
      }

      queryClient.setQueryData<Comment[]>(
        ['comments', taskId],
        (currentComments) => {
          if (!currentComments) {
            return [comment];
          }

          return currentComments.map((item) =>
            item.id === comment.id ? comment : item,
          );
        },
      );
    };

    const deleteComment = ({ commentId }: DeletedCommentPayload) => {
      queryClient.setQueryData<Comment[]>(
        ['comments', taskId],
        (currentComments) =>
          currentComments?.filter((comment) => comment.id !== commentId) ?? [],
      );
    };

    const addActivity = (activity: ActivityCreatedPayload) => {
      if (activity.task?.id !== taskId) {
        return;
      }

      queryClient.setQueryData<Activity[]>(
        ['activities', taskId],
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

    const refreshLabels = (label: TaskLabelRealtimePayload) => {
      if (label.taskId !== taskId) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ['labels', 'tasks', taskId],
      });
    };

    socket.on('connect', () => {
      socket.emit('join-task', taskId);
      socket.emit('join-project', projectId);
    });

    socket.on('comment.created', addComment);
    socket.on('comment.updated', updateComment);
    socket.on('comment.deleted', deleteComment);
    socket.on('activity.created', addActivity);
    socket.on('label.added', refreshLabels);
    socket.on('label.removed', refreshLabels);

    return () => {
      socket.off('comment.created', addComment);
      socket.off('comment.updated', updateComment);
      socket.off('comment.deleted', deleteComment);
      socket.off('activity.created', addActivity);
      socket.off('label.added', refreshLabels);
      socket.off('label.removed', refreshLabels);
      socket.disconnect();
    };
  }, [accessToken, projectId, queryClient, taskId]);
}
