import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateColumn } from '@/lib/boards';

export function useUpdateColumn(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ columnId, name }: { columnId: number; name: string }) =>
      updateColumn(boardId, columnId, {
        name,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['boards', boardId],
      });
    },
  });
}
