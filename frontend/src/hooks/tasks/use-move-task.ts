import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BoardDetails } from '@/lib/boards';
import { moveTask, type MoveTaskData, type Task } from '@/lib/tasks';

interface MoveTaskVariables {
  taskId: number;
  data: MoveTaskData;
}

interface MoveTaskContext {
  previousBoard: BoardDetails | undefined;
}

function optimisticallyMoveTask(
  board: BoardDetails,
  taskId: number,
  targetColumnId: number,
  position: number,
): BoardDetails {
  const sourceColumn = board.columns.find((column) =>
    column.tasks.some((task) => task.id === taskId),
  );

  const targetColumn = board.columns.find(
    (column) => column.id === targetColumnId,
  );

  if (!sourceColumn || !targetColumn) {
    return board;
  }

  const movedTask = sourceColumn.tasks.find((task) => task.id === taskId);

  if (!movedTask) {
    return board;
  }

  const updatedTask: Task = {
    ...movedTask,
    columnId: targetColumn.id,
    position,
    column: {
      id: targetColumn.id,
      name: targetColumn.name,
      position: targetColumn.position,
      boardId: targetColumn.boardId,
    },
  };

  if (sourceColumn.id === targetColumn.id) {
    return {
      ...board,
      columns: board.columns.map((column) => {
        if (column.id !== targetColumn.id) {
          return column;
        }

        return {
          ...column,
          tasks: [...column.tasks]
            .filter((task) => task.id !== taskId)
            .concat(updatedTask)
            .sort((a, b) => a.position - b.position),
        };
      }),
    };
  }

  return {
    ...board,
    columns: board.columns.map((column) => {
      if (column.id === sourceColumn.id) {
        return {
          ...column,
          tasks: column.tasks.filter((task) => task.id !== taskId),
          _count: {
            tasks: Math.max(0, column._count.tasks - 1),
          },
        };
      }

      if (column.id === targetColumn.id) {
        return {
          ...column,
          tasks: [...column.tasks, updatedTask].sort(
            (a, b) => a.position - b.position,
          ),
          _count: {
            tasks: column._count.tasks + 1,
          },
        };
      }

      return column;
    }),
  };
}

function replaceTaskInBoardCache(
  board: BoardDetails,
  updatedTask: Task,
): BoardDetails {
  return {
    ...board,
    columns: board.columns.map((column) => {
      const filteredTasks = column.tasks.filter(
        (task) => task.id !== updatedTask.id,
      );

      if (column.id !== updatedTask.columnId) {
        return {
          ...column,
          tasks: filteredTasks,
          _count: {
            tasks: filteredTasks.length,
          },
        };
      }

      const tasks = [...filteredTasks, updatedTask].sort(
        (a, b) => a.position - b.position,
      );

      return {
        ...column,
        tasks,
        _count: {
          tasks: tasks.length,
        },
      };
    }),
  };
}

export function useMoveTask(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, MoveTaskVariables, MoveTaskContext>({
    mutationFn: ({ taskId, data }) => moveTask(taskId, data),

    onMutate: ({ taskId, data }) => {
      const previousBoard = queryClient.getQueryData<BoardDetails>([
        'boards',
        boardId,
      ]);

      void queryClient.cancelQueries({
        queryKey: ['boards', boardId],
      });

      if (previousBoard) {
        queryClient.setQueryData<BoardDetails>(
          ['boards', boardId],
          optimisticallyMoveTask(
            previousBoard,
            taskId,
            data.columnId,
            data.position,
          ),
        );
      }

      return {
        previousBoard,
      };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['boards', boardId], context.previousBoard);
      }
    },

    onSuccess: (task) => {
      queryClient.setQueryData<BoardDetails>(
        ['boards', boardId],
        (currentBoard) => {
          if (!currentBoard) {
            return currentBoard;
          }

          return replaceTaskInBoardCache(currentBoard, task);
        },
      );

      queryClient.setQueryData(['tasks', task.id], task);
    },

    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['boards', boardId],
        refetchType: 'none',
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks', variables.taskId],
      });
    },
  });
}
