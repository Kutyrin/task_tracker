import api from '@/lib/api';

export interface AttachmentUser {
  id: number;
  email: string;
}

export interface Attachment {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  user: AttachmentUser;
}

export interface AttachmentsResponse {
  data: Attachment[];
}

export async function getAttachments(taskId: number): Promise<Attachment[]> {
  const response = await api.get<AttachmentsResponse>(
    `/tasks/${taskId}/attachments`,
  );

  return response.data.data;
}

export async function uploadAttachment(
  taskId: number,
  file: File,
): Promise<Attachment> {
  const formData = new FormData();

  formData.append('file', file);

  const response = await api.post<Attachment>(
    `/tasks/${taskId}/attachments`,
    formData,
  );

  return response.data;
}

export async function deleteAttachment(
  taskId: number,
  attachmentId: number,
): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(
    `/tasks/${taskId}/attachments/${attachmentId}`,
  );

  return response.data;
}

export async function downloadAttachment(
  taskId: number,
  attachmentId: number,
): Promise<Blob> {
  const response = await api.get<Blob>(
    `/tasks/${taskId}/attachments/${attachmentId}/download`,
    {
      responseType: 'blob',
    },
  );

  return response.data;
}
