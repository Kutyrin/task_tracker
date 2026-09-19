import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateTask, type UpdateTaskData } from '@/lib/tasks';

export function useUpdateTask(boardId: number, taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTaskData) => updateTask(taskId, data),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: ['tasks', taskId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['boards', boardId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects', task.projectId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks'],
      });
    },
  });
}
