import api from '@/lib/api';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'PROJECT_MEMBER_ADDED'
  | 'PROJECT_ROLE_UPDATED'
  | 'PROJECT_ACCESS_REVOKED';

export interface NotificationTask {
  id: number;
  title: string;
  issueNumber: number | null;
  project: {
    key: string;
  } | null;
}

export interface NotificationProject {
  id: number;
  name: string;
  key: string;
}

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  createdAt: string;
  readAt: string | null;
  userId: number;
  taskId: number | null;
  projectId: number | null;
  task: NotificationTask | null;
  project: NotificationProject | null;
}

export interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

export async function getNotifications(): Promise<NotificationsResponse> {
  const response = await api.get<NotificationsResponse>('/notifications');

  return response.data;
}

export async function markNotificationAsRead(
  notificationId: number,
): Promise<Notification> {
  const response = await api.patch<Notification>(
    `/notifications/${notificationId}/read`,
  );

  return response.data;
}

export async function markAllNotificationsAsRead(): Promise<{
  updatedCount: number;
}> {
  const response = await api.patch<{ updatedCount: number }>(
    '/notifications/read-all',
  );

  return response.data;
}
