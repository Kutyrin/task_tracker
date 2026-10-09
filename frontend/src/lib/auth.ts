import api from '@/lib/api';

export interface AuthUser {
  userId: number;
  email: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PasswordResetResponse {
  message: string;
}

export async function register(
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>('/auth/register', {
    email,
    password,
  });

  return response.data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>('/auth/login', {
    email,
    password,
  });

  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<AuthUser>('/auth/me');

  return response.data;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>('/auth/refresh', {
    refreshToken,
  });

  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetResponse> {
  const response = await api.post<PasswordResetResponse>(
    '/auth/forgot-password',
    { email },
  );

  return response.data;
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<PasswordResetResponse> {
  const response = await api.post<PasswordResetResponse>(
    '/auth/reset-password',
    { token, password },
  );

  return response.data;
}
