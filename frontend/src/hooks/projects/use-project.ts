import { useQuery } from '@tanstack/react-query';

import { getProject } from '@/lib/projects';

export function useProject(projectId: number) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => getProject(projectId),
    enabled: Number.isInteger(projectId) && projectId > 0,
  });
}
