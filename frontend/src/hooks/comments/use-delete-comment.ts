import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteComment } from '@/lib/comments';

export function useDeleteComment(taskId: number, commentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteComment(taskId, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['comments', taskId],
      });
    },
  });
}
