export type BackendFieldError = {
  field: string;
  message: string;
};

type BackendErrorPayload = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        details?: BackendFieldError[];
      };
  code?: string;
  message?: string;
  details?: BackendFieldError[];
};

export class V2ApiError extends Error {
  status: number;
  code?: string;
  details: BackendFieldError[];

  constructor(
    message: string,
    status: number,
    code?: string,
    details: BackendFieldError[] = [],
  ) {
    super(message);
    this.name = 'V2ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  skipRefresh?: boolean;
};

type AuthTokens = {
  accessToken?: string | null;
  refreshToken?: string | null;
};

const ACCESS_TOKEN_STORAGE_KEY = 'v2_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'v2_refresh_token';

const API_BASE_URL =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1')
    .replace(/\/+$/, '') || '/api/v1';

function storageGet(key: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; the API error path will handle missing tokens.
  }
}

function storageRemove(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickToken(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const token = normalizeToken(record[key]);

    if (token) {
      return token;
    }
  }

  return null;
}

export function getStoredAccessToken() {
  return storageGet(ACCESS_TOKEN_STORAGE_KEY);
}

function getStoredRefreshToken() {
  return storageGet(REFRESH_TOKEN_STORAGE_KEY);
}

export function storeAuthTokens(tokens: AuthTokens) {
  const accessToken = normalizeToken(tokens.accessToken);
  const refreshToken = normalizeToken(tokens.refreshToken);

  if (accessToken) {
    storageSet(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  }

  if (refreshToken) {
    storageSet(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
}

export function clearAuthTokens() {
  storageRemove(ACCESS_TOKEN_STORAGE_KEY);
  storageRemove(REFRESH_TOKEN_STORAGE_KEY);
}

export function extractAuthTokens(payload: unknown): AuthTokens {
  const root = asRecord(payload);
  const data = asRecord(root.data ?? payload);
  const sources = [
    data,
    asRecord(data.tokens),
    root,
    asRecord(root.tokens),
  ];

  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  for (const source of sources) {
    accessToken ??= pickToken(source, ['accessToken', 'access_token']);
    refreshToken ??= pickToken(source, ['refreshToken', 'refresh_token']);
  }

  return { accessToken, refreshToken };
}

function resolveUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildHeaders(headers: HeadersInit | undefined, hasBody: boolean) {
  const requestHeaders = new Headers(headers);
  const accessToken = getStoredAccessToken();

  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json');
  }

  if (hasBody && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (accessToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  return requestHeaders;
}

function isJsonResponse(response: Response) {
  return response.headers.get('content-type')?.includes('application/json');
}

async function readJson(response: Response) {
  if (response.status === 204) {
    return null;
  }

  if (!isJsonResponse(response)) {
    return null;
  }

  return (await response.json()) as unknown;
}

function parseBackendError(payload: unknown, status: number) {
  const fallback = status === 403 ? 'Доступ запрещен' : 'Не удалось выполнить запрос';

  if (!payload || typeof payload !== 'object') {
    return new V2ApiError(fallback, status);
  }

  const data = payload as BackendErrorPayload;

  if (typeof data.error === 'string') {
    return new V2ApiError(data.error, status, data.code, data.details ?? []);
  }

  return new V2ApiError(
    data.error?.message ?? data.message ?? fallback,
    status,
    data.error?.code ?? data.code,
    data.error?.details ?? data.details ?? [],
  );
}

async function refreshSession() {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    clearAuthTokens();
    return false;
  }

  const response = await fetch(resolveUrl('/auth/refresh'), {
    body: JSON.stringify({ refreshToken }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = await readJson(response);

  if (!response.ok) {
    clearAuthTokens();
    return false;
  }

  const tokens = extractAuthTokens(payload);

  if (!tokens.accessToken) {
    clearAuthTokens();
    return false;
  }

  storeAuthTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? refreshToken,
  });

  return true;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, skipRefresh, ...requestOptions } = options;
  const response = await fetch(resolveUrl(path), {
    ...requestOptions,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: buildHeaders(headers, body !== undefined),
  });

  if (response.status === 401 && !skipRefresh && path !== '/auth/refresh') {
    const refreshed = await refreshSession();

    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
  }

  const payload = await readJson(response);

  if (!response.ok) {
    throw parseBackendError(payload, response.status);
  }

  return payload as T;
}

export function fieldErrorsFromApiError(error: unknown) {
  if (!(error instanceof V2ApiError)) {
    return {};
  }

  const details = error.details.map((detail) => [
    normalizeFieldName(detail.field),
    detail.message,
  ]);

  if (error.code === 'DUPLICATE_LOGIN') {
    details.push(['login', error.message]);
  }

  return Object.fromEntries(details) as Record<string, string>;
}

function normalizeFieldName(field: string) {
  const aliases: Record<string, string> = {
    full_name: 'fullName',
    must_change_password: 'mustChangePassword',
    old_password: 'oldPassword',
    new_password: 'newPassword',
    refresh_token: 'refreshToken',
    username: 'login',
  };

  return aliases[field] ?? field;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Не удалось выполнить запрос',
) {
  return error instanceof Error && error.message ? error.message : fallback;
}
