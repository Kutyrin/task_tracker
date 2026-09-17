import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addProjectMember } from '@/lib/projects';

export function useAddProjectMember(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof addProjectMember>[1]) =>
      addProjectMember(projectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'members'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
    },
  });
}
