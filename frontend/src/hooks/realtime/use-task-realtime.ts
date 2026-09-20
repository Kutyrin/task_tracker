'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import type { Comment } from '@/lib/comments';
import { useAppSelector } from '@/store/hooks';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface DeletedCommentPayload {
  commentId: number;
}

export function useTaskRealtime(taskId: number) {
  const queryClient = useQueryClient();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!accessToken || !Number.isInteger(taskId) || taskId <= 0) {
      return;
    }

    const socket: Socket = io(API_URL, {
      auth: {
        token: accessToken,
      },
    });

    const addComment = (comment: Comment) => {
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

    socket.on('connect', () => {
      socket.emit('join-task', taskId);
    });

    socket.on('comment.created', addComment);
    socket.on('comment.updated', updateComment);
    socket.on('comment.deleted', deleteComment);

    return () => {
      socket.off('comment.created', addComment);
      socket.off('comment.updated', updateComment);
      socket.off('comment.deleted', deleteComment);
      socket.disconnect();
    };
  }, [accessToken, queryClient, taskId]);
}
