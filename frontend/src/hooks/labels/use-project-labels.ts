import { useQuery } from '@tanstack/react-query';

import { getProjectLabels } from '@/lib/labels';

export function useProjectLabels(projectId: number) {
  return useQuery({
    queryKey: ['labels', 'projects', projectId],
    queryFn: () => getProjectLabels(projectId),
    enabled: Number.isInteger(projectId) && projectId > 0,
  });
}
