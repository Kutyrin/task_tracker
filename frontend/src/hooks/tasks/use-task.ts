import { useQuery } from '@tanstack/react-query';

import { getTask } from '@/lib/tasks';

export function useTask(taskId: number) {
  return useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => getTask(taskId),
    enabled: Number.isInteger(taskId) && taskId > 0,
  });
}
