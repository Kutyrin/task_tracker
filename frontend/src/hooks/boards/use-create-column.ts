import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createColumn } from '@/lib/boards';

export function useCreateColumn(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      createColumn(boardId, {
        name,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['boards', boardId],
      });
    },
  });
}
