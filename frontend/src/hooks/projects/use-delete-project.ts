import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteProject } from '@/lib/projects';

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) => deleteProject(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.removeQueries({
        queryKey: ['projects', projectId],
        exact: true,
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects', 'stats'],
      });
    },
  });
}
