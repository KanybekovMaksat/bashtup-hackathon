import {
  V2ApiError,
  apiRequest,
  clearAuthTokens,
  extractAuthTokens,
  storeAuthTokens,
} from './apiClient';
import { asRecord, normalizeUser } from './normalizers';
import type { ChangePasswordPayload, LoginPayload, LoginResult, User } from '../types';

export async function login(payload: LoginPayload): Promise<LoginResult> {
  clearAuthTokens();

  const response = await apiRequest<unknown>('/auth/login', {
    body: payload,
    method: 'POST',
    skipRefresh: true,
  });
  const record = asRecord(response);
  const data = asRecord(record.data ?? response);
  const userPayload = data.user ?? response;
  const user = normalizeUser(userPayload);
  const tokens = extractAuthTokens(response);

  if (!tokens.accessToken || !tokens.refreshToken) {
    clearAuthTokens();
    throw new V2ApiError('Auth tokens were not returned by server', 500);
  }

  storeAuthTokens(tokens);

  const mustChangePassword =
    Boolean(data.mustChangePassword ?? data.must_change_password) ||
    Boolean(user.mustChangePassword);

  return {
    accessToken: tokens.accessToken,
    mustChangePassword,
    refreshToken: tokens.refreshToken,
    user: { ...user, mustChangePassword },
  };
}

export async function logout() {
  try {
    await apiRequest<unknown>('/auth/logout', {
      method: 'POST',
      skipRefresh: true,
    });
  } finally {
    clearAuthTokens();
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiRequest<unknown>('/auth/me');
  const record = asRecord(response);
  const user = normalizeUser(record.user ?? record.data ?? response);

  if (!user.id && !user.login) {
    throw new V2ApiError('Сессия не найдена', 401);
  }

  return user;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<User | null> {
  const response = await apiRequest<unknown>('/auth/change-password', {
    body: payload,
    method: 'POST',
  });
  const record = asRecord(response);
  const userPayload = record.user ?? asRecord(record.data).user ?? null;

  return userPayload ? normalizeUser(userPayload) : null;
}
