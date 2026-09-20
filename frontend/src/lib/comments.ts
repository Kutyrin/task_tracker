import api from '@/lib/api';

export interface CommentUser {
  id: number;
  email: string;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  taskId: number;
  userId: number;
  user: CommentUser;
}

export interface CreateCommentData {
  content: string;
}

export interface UpdateCommentData {
  content: string;
}

export async function getComments(taskId: number): Promise<Comment[]> {
  const response = await api.get<Comment[]>(`/tasks/${taskId}/comments`);

  return response.data;
}

export async function createComment(
  taskId: number,
  data: CreateCommentData,
): Promise<Comment> {
  const response = await api.post<Comment>(`/tasks/${taskId}/comments`, data);

  return response.data;
}

export async function updateComment(
  taskId: number,
  commentId: number,
  data: UpdateCommentData,
): Promise<Comment> {
  const response = await api.patch<Comment>(
    `/tasks/${taskId}/comments/${commentId}`,
    data,
  );

  return response.data;
}

export async function deleteComment(
  taskId: number,
  commentId: number,
): Promise<void> {
  await api.delete(`/tasks/${taskId}/comments/${commentId}`);
}
