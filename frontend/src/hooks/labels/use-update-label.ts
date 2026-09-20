import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateLabel, type UpdateLabelData } from '@/lib/labels';

export function useUpdateLabel(projectId: number, labelId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateLabelData) =>
      updateLabel(projectId, labelId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['labels', 'projects', projectId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['labels', 'tasks'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks'],
      });
    },
  });
}
