import { useMutation, useQueryClient } from '@tanstack/react-query';

import { removeProjectMember } from '@/lib/projects';

export function useRemoveProjectMember(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: number) => removeProjectMember(projectId, memberId),
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
