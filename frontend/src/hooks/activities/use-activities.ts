import { useQuery } from '@tanstack/react-query';

import { getActivities } from '@/lib/activities';

export function useActivities(taskId: number) {
  return useQuery({
    queryKey: ['activities', taskId],
    queryFn: () => getActivities(taskId),
    enabled: Number.isInteger(taskId) && taskId > 0,
  });
}
