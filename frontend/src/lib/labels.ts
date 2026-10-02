import api from '@/lib/api';

export interface Label {
  id: number;
  name: string;
  projectId: number;
  createdAt?: string;
  _count?: {
    tasks: number;
  };
}

export interface TaskLabel {
  id: number;
  name: string;
  createdAt: string;
  projectId: number;
}

export interface CreateLabelData {
  name: string;
}

export interface UpdateLabelData {
  name: string;
}

export interface AssignLabelData {
  labelId: number;
}

export async function getProjectLabels(projectId: number): Promise<Label[]> {
  const response = await api.get<Label[]>(`/projects/${projectId}/labels`);

  return response.data;
}

export async function getTaskLabels(taskId: number): Promise<TaskLabel[]> {
  const response = await api.get<TaskLabel[]>(`/tasks/${taskId}/labels`);

  return response.data;
}

export async function createLabel(
  projectId: number,
  data: CreateLabelData,
): Promise<Label> {
  const response = await api.post<Label>(`/projects/${projectId}/labels`, data);

  return response.data;
}

export async function updateLabel(
  projectId: number,
  labelId: number,
  data: UpdateLabelData,
): Promise<Label> {
  const response = await api.patch<Label>(
    `/projects/${projectId}/labels/${labelId}`,
    data,
  );

  return response.data;
}

export async function deleteLabel(
  projectId: number,
  labelId: number,
): Promise<void> {
  await api.delete(`/projects/${projectId}/labels/${labelId}`);
}

export async function assignLabelToTask(
  taskId: number,
  data: AssignLabelData,
): Promise<void> {
  await api.post(`/tasks/${taskId}/labels`, data);
}

export async function removeLabelFromTask(
  taskId: number,
  labelId: number,
): Promise<void> {
  await api.delete(`/tasks/${taskId}/labels/${labelId}`);
}
