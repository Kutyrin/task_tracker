import { useQuery } from '@tanstack/react-query';

import { getTaskLabels } from '@/lib/labels';

export function useTaskLabels(taskId: number) {
  return useQuery({
    queryKey: ['labels', 'tasks', taskId],
    queryFn: () => getTaskLabels(taskId),
    enabled: Number.isInteger(taskId) && taskId > 0,
  });
}
