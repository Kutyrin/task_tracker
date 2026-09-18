import { useMutation, useQueryClient } from '@tanstack/react-query';

import { moveColumn } from '@/lib/boards';

export function useMoveColumn(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      columnId,
      position,
    }: {
      columnId: number;
      position: number;
    }) =>
      moveColumn(boardId, columnId, {
        position,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['boards', boardId],
      });
    },
  });
}
