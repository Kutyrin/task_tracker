import api from "@/lib/api";

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

export async function register(
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>("/auth/register", {
    email,
    password,
  });

  return response.data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>("/auth/login", {
    email,
    password,
  });

  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<AuthUser>("/auth/me");

  return response.data;
}

export async function refreshTokens(
  refreshToken: string,
): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>("/auth/refresh", {
    refreshToken,
  });

  return response.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}
