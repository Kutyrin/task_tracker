import api from '@/lib/api';

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Project {
  id: number;
  name: string;
  key: string;
  description: string | null;
  role: ProjectRole | null;
  taskCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetails extends Project {
  ownerId: number;
}

export interface ProjectMemberUser {
  id: number;
  email: string;
}

export interface ProjectMember {
  id: number;
  role: ProjectRole;
  createdAt: string;
  user: ProjectMemberUser;
}

interface ProjectsResponse {
  data: Project[];
}

export interface CreateProjectData {
  name: string;
  key: string;
  description?: string;
}

export async function getProjects(): Promise<Project[]> {
  const response = await api.get<ProjectsResponse>('/projects');

  return response.data.data;
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const response = await api.post<Project>('/projects', data);

  return response.data;
}

export async function getProject(projectId: number): Promise<ProjectDetails> {
  const response = await api.get<ProjectDetails>(`/projects/${projectId}`);

  return response.data;
}

export async function getProjectMembers(
  projectId: number,
): Promise<ProjectMember[]> {
  const response = await api.get<ProjectMember[]>(
    `/projects/${projectId}/members`,
  );

  return response.data;
}

export interface AddProjectMemberData {
  email: string;
  role: Exclude<ProjectRole, 'OWNER'>;
}

export async function addProjectMember(
  projectId: number,
  data: AddProjectMemberData,
): Promise<ProjectMember> {
  const response = await api.post<ProjectMember>(
    `/projects/${projectId}/members`,
    data,
  );

  return response.data;
}

export interface UpdateProjectMemberData {
  role: Exclude<ProjectRole, 'OWNER'>;
}

export async function updateProjectMemberRole(
  projectId: number,
  memberId: number,
  data: UpdateProjectMemberData,
): Promise<ProjectMember> {
  const response = await api.patch<ProjectMember>(
    `/projects/${projectId}/members/${memberId}`,
    data,
  );

  return response.data;
}

export async function removeProjectMember(
  projectId: number,
  memberId: number,
): Promise<void> {
  await api.delete(`/projects/${projectId}/members/${memberId}`);
}
