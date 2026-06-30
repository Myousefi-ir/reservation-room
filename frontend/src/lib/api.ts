const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

const ACCESS_KEY = 'mvr_access';
const REFRESH_KEY = 'mvr_refresh';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}
export function setTokens(access: string, refresh: string): void {
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function rawRequest(path: string, options: RequestInit, withAuth: boolean): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (withAuth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${BASE}${path}`, { ...options, headers });
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  })();
  const result = await refreshing;
  refreshing = null;
  return result;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  withAuth = true,
): Promise<T> {
  let res = await rawRequest(path, options, withAuth);

  if (res.status === 401 && withAuth) {
    const ok = await tryRefresh();
    if (ok) {
      res = await rawRequest(path, options, withAuth);
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const raw = data?.message ?? 'خطایی رخ داد. دوباره تلاش کنید.';
    const message = Array.isArray(raw) ? raw.join('، ') : String(raw);
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, withAuth = true) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, withAuth),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

/** Downloads a reservation's .ics file (with auth + refresh handling). */
export async function downloadIcs(reservationId: string, filename = 'reservation.ics'): Promise<void> {
  const path = `/reservations/${reservationId}/calendar.ics`;
  let res = await rawRequest(path, { method: 'GET' }, true);
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) res = await rawRequest(path, { method: 'GET' }, true);
  }
  if (!res.ok) throw new ApiError('دانلود فایل تقویم ناموفق بود.', res.status);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
