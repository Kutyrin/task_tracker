import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProjectMemberRole } from '@/lib/projects';

export function useUpdateProjectMemberRole(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: number;
      role: Exclude<'OWNER' | 'ADMIN' | 'MEMBER', 'OWNER'>;
    }) =>
      updateProjectMemberRole(projectId, memberId, {
        role,
      }),
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
