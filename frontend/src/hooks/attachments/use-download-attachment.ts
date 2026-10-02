import { useMutation } from '@tanstack/react-query';

import { downloadAttachment } from '@/lib/attachments';

export function useDownloadAttachment(taskId: number, attachmentId: number) {
  return useMutation({
    mutationFn: () => downloadAttachment(taskId, attachmentId),
  });
}
