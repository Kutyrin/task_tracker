import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteLabel } from '@/lib/labels';

export function useDeleteLabel(projectId: number, labelId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteLabel(projectId, labelId),
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
