import api from '@/lib/api';

export interface ActivityUser {
  id: number;
  email: string;
}

export interface ActivityTask {
  id: number;
  issueNumber: number | null;
  title: string;
  project: {
    key: string;
  } | null;
}

export interface Activity {
  id: number;
  type: string;
  message: string;
  metadata: unknown;
  createdAt: string;
  user: ActivityUser;
  task?: ActivityTask | null;
}

export async function getActivities(taskId: number): Promise<Activity[]> {
  const response = await api.get<Activity[]>(`/tasks/${taskId}/activities`);

  return response.data;
}

export async function getProjectActivities(
  projectId: number,
): Promise<Activity[]> {
  const response = await api.get<{ data: Activity[] }>(
    `/projects/${projectId}/activities`,
  );

  return response.data.data;
}
