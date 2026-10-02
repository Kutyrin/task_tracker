import { useMutation, useQueryClient } from '@tanstack/react-query';

import { removeLabelFromTask } from '@/lib/labels';

export function useRemoveLabel(taskId: number, labelId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => removeLabelFromTask(taskId, labelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['labels', 'tasks', taskId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks', taskId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks'],
      });
    },
  });
}
