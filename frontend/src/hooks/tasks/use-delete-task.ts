import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTask } from '@/lib/tasks';

export function useDeleteTask(boardId: number, taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['boards', boardId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
    },
  });
}
