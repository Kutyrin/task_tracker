import { useMutation, useQueryClient } from '@tanstack/react-query';

import { uploadAttachment, type Attachment } from '@/lib/attachments';
import { attachmentsQueryKey } from './use-attachments';

export function useUploadAttachment(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAttachment(taskId, file),
    onSuccess: (attachment) => {
      queryClient.setQueryData<Attachment[]>(
        attachmentsQueryKey(taskId),
        (currentAttachments) => {
          if (currentAttachments?.some((item) => item.id === attachment.id)) {
            return currentAttachments;
          }

          return [attachment, ...(currentAttachments ?? [])];
        },
      );
    },
  });
}
