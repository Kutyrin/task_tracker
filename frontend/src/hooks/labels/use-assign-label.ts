import { useMutation, useQueryClient } from '@tanstack/react-query';

import { assignLabelToTask, type AssignLabelData } from '@/lib/labels';

export function useAssignLabel(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignLabelData) => assignLabelToTask(taskId, data),
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
