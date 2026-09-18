import { useQuery } from '@tanstack/react-query';

import { getProjectBoards } from '@/lib/boards';

export function useProjectBoards(projectId: number) {
  return useQuery({
    queryKey: ['projects', projectId, 'boards'],
    queryFn: () => getProjectBoards(projectId),
    enabled: Number.isInteger(projectId) && projectId > 0,
  });
}
