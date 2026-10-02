import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteAttachment, type Attachment } from '@/lib/attachments';
import { attachmentsQueryKey } from './use-attachments';

export function useDeleteAttachment(taskId: number, attachmentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAttachment(taskId, attachmentId),
    onSuccess: () => {
      queryClient.setQueryData<Attachment[]>(
        attachmentsQueryKey(taskId),
        (currentAttachments) =>
          currentAttachments?.filter(
            (attachment) => attachment.id !== attachmentId,
          ) ?? [],
      );
    },
  });
}
