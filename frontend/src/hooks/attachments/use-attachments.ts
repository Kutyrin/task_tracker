import { useQuery } from '@tanstack/react-query';

import { getAttachments } from '@/lib/attachments';

export const attachmentsQueryKey = (taskId: number) => ['attachments', taskId];

export function useAttachments(taskId: number) {
  return useQuery({
    queryKey: attachmentsQueryKey(taskId),
    queryFn: () => getAttachments(taskId),
    enabled: Number.isInteger(taskId) && taskId > 0,
  });
}
