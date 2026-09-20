import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createComment, type CreateCommentData } from '@/lib/comments';

export function useCreateComment(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentData) => createComment(taskId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['comments', taskId],
      });
    },
  });
}
