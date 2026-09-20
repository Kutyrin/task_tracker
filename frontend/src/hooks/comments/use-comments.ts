import { useQuery } from '@tanstack/react-query';

import { getComments } from '@/lib/comments';

export function useComments(taskId: number) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => getComments(taskId),
    enabled: Number.isInteger(taskId) && taskId > 0,
  });
}
