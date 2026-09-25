'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import type { Attachment } from '@/lib/attachments';
import type { Activity } from '@/lib/activities';
import type { Comment } from '@/lib/comments';
import type { Task } from '@/lib/tasks';
import type { TaskLabel } from '@/lib/labels';
import { useAppSelector } from '@/store/hooks';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface DeletedCommentPayload {
  commentId: number;
}

interface DeletedTaskPayload {
  taskId: number;
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

interface AttachmentUploadedPayload extends Attachment {
  taskId: number;
}

interface AttachmentDeletedPayload {
  id: number;
  taskId: number;
}

export function useTaskRealtime(
  taskId: number,
  projectId: number | null,
  onTaskDeleted?: () => void,
) {
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

    const updateTask = (task: Task) => {
      if (task.id !== taskId) {
        return;
      }

      queryClient.setQueryData<Task>(['tasks', taskId], task);
    };

    const deleteTask = ({ taskId: deletedTaskId }: DeletedTaskPayload) => {
      if (deletedTaskId !== taskId) {
        return;
      }

      queryClient.removeQueries({
        queryKey: ['tasks', taskId],
        exact: true,
      });

      queryClient.removeQueries({
        queryKey: ['labels', 'tasks', taskId],
        exact: true,
      });

      queryClient.removeQueries({
        queryKey: ['attachments', taskId],
        exact: true,
      });

      onTaskDeleted?.();
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

    const addLabel = (label: TaskLabelRealtimePayload) => {
      if (label.taskId !== taskId) {
        return;
      }

      const taskLabel: TaskLabel = {
        id: label.id,
        name: label.name,
        createdAt: new Date().toISOString(),
        projectId,
      };

      queryClient.setQueryData<TaskLabel[]>(
        ['labels', 'tasks', taskId],
        (currentLabels) => {
          if (currentLabels?.some((item) => item.id === label.id)) {
            return currentLabels;
          }

          return [...(currentLabels ?? []), taskLabel].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        },
      );

      queryClient.setQueryData<Task>(['tasks', taskId], (currentTask) => {
        if (!currentTask) {
          return currentTask;
        }

        if (currentTask.labels.some((item) => item.id === label.id)) {
          return currentTask;
        }

        return {
          ...currentTask,
          labels: [
            ...currentTask.labels,
            {
              id: label.id,
              name: label.name,
            },
          ].sort((a, b) => a.name.localeCompare(b.name)),
        };
      });

      void queryClient.invalidateQueries({
        queryKey: ['labels', 'tasks', taskId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks', taskId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks'],
      });
    };

    const removeLabel = (label: TaskLabelRealtimePayload) => {
      if (label.taskId !== taskId) {
        return;
      }

      queryClient.setQueryData<TaskLabel[]>(
        ['labels', 'tasks', taskId],
        (currentLabels) =>
          currentLabels?.filter((item) => item.id !== label.id) ?? [],
      );

      queryClient.setQueryData<Task>(['tasks', taskId], (currentTask) => {
        if (!currentTask) {
          return currentTask;
        }

        return {
          ...currentTask,
          labels: currentTask.labels.filter((item) => item.id !== label.id),
        };
      });

      void queryClient.invalidateQueries({
        queryKey: ['labels', 'tasks', taskId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks', taskId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks'],
      });
    };

    const addAttachment = (attachment: AttachmentUploadedPayload) => {
      if (attachment.taskId !== taskId) {
        return;
      }

      queryClient.setQueryData<Attachment[]>(
        ['attachments', taskId],
        (currentAttachments) => {
          if (currentAttachments?.some((item) => item.id === attachment.id)) {
            return currentAttachments;
          }

          return [attachment, ...(currentAttachments ?? [])];
        },
      );
    };

    const deleteAttachment = ({
      id,
      taskId: deletedTaskId,
    }: AttachmentDeletedPayload) => {
      if (deletedTaskId !== taskId) {
        return;
      }

      queryClient.setQueryData<Attachment[]>(
        ['attachments', taskId],
        (currentAttachments) =>
          currentAttachments?.filter((attachment) => attachment.id !== id) ??
          [],
      );
    };

    socket.on('connect', () => {
      socket.emit('join-task', taskId);
      socket.emit('join-project', projectId);
    });

    socket.on('comment.created', addComment);
    socket.on('comment.updated', updateComment);
    socket.on('comment.deleted', deleteComment);

    socket.on('task.updated', updateTask);
    socket.on('task.moved', updateTask);
    socket.on('task.deleted', deleteTask);

    socket.on('activity.created', addActivity);

    socket.on('attachment.uploaded', addAttachment);
    socket.on('attachment.deleted', deleteAttachment);

    socket.on('label.added', addLabel);
    socket.on('label.removed', removeLabel);

    return () => {
      socket.off('comment.created', addComment);
      socket.off('comment.updated', updateComment);
      socket.off('comment.deleted', deleteComment);

      socket.off('task.updated', updateTask);
      socket.off('task.moved', updateTask);
      socket.off('task.deleted', deleteTask);

      socket.off('activity.created', addActivity);

      socket.off('attachment.uploaded', addAttachment);
      socket.off('attachment.deleted', deleteAttachment);

      socket.off('label.added', addLabel);
      socket.off('label.removed', removeLabel);

      socket.disconnect();
    };
  }, [accessToken, projectId, queryClient, taskId, onTaskDeleted]);
}
