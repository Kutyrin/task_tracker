import { useMutation, useQueryClient } from '@tanstack/react-query';

import { moveColumn, type BoardColumn, type BoardDetails } from '@/lib/boards';

interface MoveColumnVariables {
  columnId: number;
  position: number;
}

interface MoveColumnContext {
  previousBoard: BoardDetails | undefined;
}

function optimisticallyMoveColumn(
  board: BoardDetails,
  columnId: number,
  position: number,
): BoardDetails {
  const columnExists = board.columns.some((column) => column.id === columnId);

  if (!columnExists) {
    return board;
  }

  return {
    ...board,
    columns: board.columns
      .map((column) =>
        column.id === columnId
          ? {
              ...column,
              position,
            }
          : column,
      )
      .sort((a, b) => a.position - b.position),
  };
}

function replaceColumnInBoardCache(
  board: BoardDetails,
  updatedColumn: BoardColumn,
): BoardDetails {
  return {
    ...board,
    columns: board.columns
      .map((column) =>
        column.id === updatedColumn.id
          ? {
              ...column,
              name: updatedColumn.name,
              position: updatedColumn.position,
              updatedAt: updatedColumn.updatedAt,
            }
          : column,
      )
      .sort((a, b) => a.position - b.position),
  };
}

export function useMoveColumn(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation<
    BoardColumn,
    Error,
    MoveColumnVariables,
    MoveColumnContext
  >({
    mutationFn: ({ columnId, position }) =>
      moveColumn(boardId, columnId, {
        position,
      }),

    onMutate: ({ columnId, position }) => {
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
          optimisticallyMoveColumn(previousBoard, columnId, position),
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

    onSuccess: (updatedColumn) => {
      queryClient.setQueryData<BoardDetails>(
        ['boards', boardId],
        (currentBoard) => {
          if (!currentBoard) {
            return currentBoard;
          }

          return replaceColumnInBoardCache(currentBoard, updatedColumn);
        },
      );
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['boards', boardId],
        refetchType: 'none',
      });
    },
  });
}
