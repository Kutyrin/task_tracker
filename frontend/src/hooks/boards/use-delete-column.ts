import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteColumn } from '@/lib/boards';

export function useDeleteColumn(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnId: number) => deleteColumn(boardId, columnId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['boards', boardId],
      });
    },
  });
}
