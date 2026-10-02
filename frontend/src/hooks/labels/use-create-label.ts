import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createLabel, type CreateLabelData } from '@/lib/labels';

export function useCreateLabel(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLabelData) => createLabel(projectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['labels', 'projects', projectId],
      });
    },
  });
}
