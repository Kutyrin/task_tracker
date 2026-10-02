'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import type { BoardDetails } from '@/lib/boards';
import type { Task } from '@/lib/tasks';
import { useAppSelector } from '@/store/hooks';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface DeletedTaskPayload {
  taskId: number;
}

interface TaskLabelRealtimePayload {
  id: number;
  name: string;
  taskId: number;
}

export function useBoardRealtime(boardId: number, projectId: number | null) {
  const queryClient = useQueryClient();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (
      !accessToken ||
      !Number.isInteger(boardId) ||
      boardId <= 0 ||
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

    const updateBoardTasks = (
      updater: (board: BoardDetails) => BoardDetails,
    ) => {
      queryClient.setQueryData<BoardDetails>(
        ['boards', boardId],
        (currentBoard) => {
          if (!currentBoard) {
            return currentBoard;
          }

          return updater(currentBoard);
        },
      );
    };

    const upsertTask = (task: Task) => {
      if (task.projectId !== projectId || !task.columnId) {
        return;
      }

      updateBoardTasks((board) => {
        const columnsWithoutTask = board.columns.map((column) => ({
          ...column,
          tasks: column.tasks.filter(
            (currentTask) => currentTask.id !== task.id,
          ),
        }));

        const targetColumn = columnsWithoutTask.find(
          (column) => column.id === task.columnId,
        );

        if (!targetColumn) {
          return board;
        }

        targetColumn.tasks = [...targetColumn.tasks, task].sort(
          (a, b) => a.position - b.position,
        );

        return {
          ...board,
          columns: columnsWithoutTask.map((column) => ({
            ...column,
            _count: {
              tasks: column.tasks.length,
            },
          })),
        };
      });
    };

    const updateTaskLabels = (
      label: TaskLabelRealtimePayload,
      action: 'add' | 'remove',
    ) => {
      updateBoardTasks((board) => ({
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) => {
            if (task.id !== label.taskId) {
              return task;
            }

            if (action === 'add') {
              if (task.labels.some((item) => item.id === label.id)) {
                return task;
              }

              return {
                ...task,
                labels: [
                  ...task.labels,
                  {
                    id: label.id,
                    name: label.name,
                  },
                ].sort((a, b) => a.name.localeCompare(b.name)),
              };
            }

            return {
              ...task,
              labels: task.labels.filter((item) => item.id !== label.id),
            };
          }),
        })),
      }));
    };

    const addLabel = (label: TaskLabelRealtimePayload) => {
      if (label.taskId <= 0) {
        return;
      }

      updateTaskLabels(label, 'add');
    };

    const removeLabel = (label: TaskLabelRealtimePayload) => {
      if (label.taskId <= 0) {
        return;
      }

      updateTaskLabels(label, 'remove');
    };

    const deleteTask = ({ taskId }: DeletedTaskPayload) => {
      updateBoardTasks((board) => ({
        ...board,
        columns: board.columns.map((column) => {
          const tasks = column.tasks.filter((task) => task.id !== taskId);

          return {
            ...column,
            tasks,
            _count: {
              tasks: tasks.length,
            },
          };
        }),
      }));
    };

    socket.on('connect', () => {
      socket.emit('join-project', projectId);
    });

    socket.on('task.created', upsertTask);
    socket.on('task.updated', upsertTask);
    socket.on('task.moved', upsertTask);
    socket.on('task.deleted', deleteTask);

    socket.on('label.added', addLabel);
    socket.on('label.removed', removeLabel);

    return () => {
      socket.off('task.created', upsertTask);
      socket.off('task.updated', upsertTask);
      socket.off('task.moved', upsertTask);
      socket.off('task.deleted', deleteTask);

      socket.off('label.added', addLabel);
      socket.off('label.removed', removeLabel);

      socket.disconnect();
    };
  }, [accessToken, boardId, projectId, queryClient]);
}
