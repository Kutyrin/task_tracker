import api from '@/lib/api';

export type IssueType = 'TASK' | 'BUG' | 'STORY' | 'EPIC';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type TaskSortBy =
  'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title' | 'position';

export type SortOrder = 'asc' | 'desc';

export interface TaskLabel {
  id: number;
  name: string;
}

export interface TaskUser {
  id: number;
  email: string;
}

export interface TaskProject {
  id: number;
  name: string;
  key: string;
}

export interface TaskColumn {
  id: number;
  name: string;
  position: number;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  issueNumber: number | null;
  issueKey: string | null;
  issueType: IssueType;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  userId: number;
  reporterId: number | null;
  assigneeId: number | null;
  projectId: number | null;
  columnId: number | null;
  project: TaskProject | null;
  column: TaskColumn | null;
  reporter: TaskUser | null;
  assignee: TaskUser | null;
  labels: TaskLabel[];
}

export interface CreateTaskData {
  title: string;
  description?: string;
  issueType?: IssueType;
  priority?: TaskPriority;
  dueDate?: string;
  projectId: number;
  columnId: number;
  assigneeId?: number;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  issueType?: IssueType;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeId?: number | null;
}

export interface MoveTaskData {
  columnId: number;
  position: number;
}

export interface TaskQuery {
  page?: number;
  limit?: number;
  columnId?: number;
  issueType?: IssueType;
  priority?: TaskPriority;
  search?: string;
  labels?: string;
  dueBefore?: string;
  dueAfter?: string;
  sortBy?: TaskSortBy;
  sortOrder?: SortOrder;
}

export interface TasksResponse {
  data: Task[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sortBy: TaskSortBy;
    sortOrder: SortOrder;
  };
}

export async function getTasks(params?: TaskQuery): Promise<TasksResponse> {
  const response = await api.get<TasksResponse>('/tasks', {
    params,
  });

  return response.data;
}

export async function getTask(taskId: number): Promise<Task> {
  const response = await api.get<Task>(`/tasks/${taskId}`);

  return response.data;
}

export async function createTask(data: CreateTaskData): Promise<Task> {
  const response = await api.post<Task>('/tasks', data);

  return response.data;
}

export async function updateTask(
  taskId: number,
  data: UpdateTaskData,
): Promise<Task> {
  const response = await api.patch<Task>(`/tasks/${taskId}`, data);

  return response.data;
}

export async function moveTask(
  taskId: number,
  data: MoveTaskData,
): Promise<Task> {
  const response = await api.patch<Task>(`/tasks/${taskId}/move`, data);

  return response.data;
}

export async function deleteTask(taskId: number): Promise<void> {
  await api.delete(`/tasks/${taskId}`);
}
