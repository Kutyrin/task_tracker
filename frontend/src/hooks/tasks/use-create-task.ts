import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createTask, type CreateTaskData } from '@/lib/tasks';

export function useCreateTask(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskData) => createTask(data),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: ['boards', boardId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects', task.projectId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
    },
  });
}
