import { useQuery } from '@tanstack/react-query';

import { getTasks, type TaskQuery } from '@/lib/tasks';

export function useTasks(params?: TaskQuery) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => getTasks(params),
  });
}
