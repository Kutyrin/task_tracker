import { useQuery } from '@tanstack/react-query';

import { getProjectMembers } from '@/lib/projects';

export function useProjectMembers(projectId: number) {
  return useQuery({
    queryKey: ['projects', projectId, 'members'],
    queryFn: () => getProjectMembers(projectId),
    enabled: Number.isInteger(projectId) && projectId > 0,
  });
}
