import type { AuthTokens } from "@/lib/auth";

const STORAGE_KEY = "task-tracker-auth";

export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function getStoredTokens(): AuthTokens | null {
  const value = localStorage.getItem(STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    const tokens = JSON.parse(value) as AuthTokens;

    if (!tokens.accessToken || !tokens.refreshToken) {
      return null;
    }

    return tokens;
  } catch {
    return null;
  }
}

export function clearStoredTokens() {
  localStorage.removeItem(STORAGE_KEY);
}
