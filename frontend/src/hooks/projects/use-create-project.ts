import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createProject } from '@/lib/projects';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
    },
  });
}
