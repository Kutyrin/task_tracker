import { useQuery } from '@tanstack/react-query';

import { getProjectActivities } from '@/lib/activities';

export const projectActivitiesQueryKey = (projectId: number) => [
  'activities',
  'projects',
  projectId,
];

export function useProjectActivities(projectId: number) {
  return useQuery({
    queryKey: projectActivitiesQueryKey(projectId),
    queryFn: () => getProjectActivities(projectId),
    enabled: Number.isInteger(projectId) && projectId > 0,
  });
}
