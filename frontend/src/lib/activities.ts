import api from '@/lib/api';

export interface ActivityUser {
  id: number;
  email: string;
}

export interface Activity {
  id: number;
  type: string;
  message: string;
  metadata: unknown;
  createdAt: string;
  user: ActivityUser;
}

export async function getActivities(taskId: number): Promise<Activity[]> {
  const response = await api.get<Activity[]>(`/tasks/${taskId}/activities`);

  return response.data;
}
