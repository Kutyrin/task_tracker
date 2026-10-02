import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateComment, type UpdateCommentData } from '@/lib/comments';

export function useUpdateComment(taskId: number, commentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCommentData) =>
      updateComment(taskId, commentId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['comments', taskId],
      });
    },
  });
}
