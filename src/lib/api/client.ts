import useAuthStore from '@/stores/useAuthStore';

/**
 * Single HTTP client for the API server.
 *
 * The server wraps every response in an envelope:
 *   success: { status: 'success', message: [{ success: [text] }], data }
 *   failure: { status: 'failed' | 'error', message: [{ error: [text | text[]] }] }
 * Some endpoints report auth failures as 400 or even 200 with a "jwt ..." error.
 */

export const API_BASE_URL: string = import.meta.env.BN_BASE_URL ?? '';

export interface ApiEnvelope<T = unknown> {
  status: 'success' | 'failed' | 'error';
  message?: Array<{ success?: unknown[]; error?: unknown[] }>;
  data: T;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

/** Flattens the envelope's nested message arrays into readable text. */
export function extractMessages(body: unknown, kind: 'error' | 'success' = 'error'): string[] {
  if (!body || typeof body !== 'object') return [];
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string') return [message];
  if (!Array.isArray(message)) return [];
  return message
    .flatMap((m) => (m && typeof m === 'object' ? ((m as Record<string, unknown>)[kind] as unknown[]) ?? [] : []))
    .flat(Infinity)
    .filter((m): m is string => typeof m === 'string' && m.length > 0);
}

function isFailedEnvelope(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const status = (body as { status?: unknown }).status;
  return status === 'failed' || status === 'error';
}

function isAuthFailure(httpStatus: number, body: unknown): boolean {
  if (httpStatus === 401) return true;
  if (!isFailedEnvelope(body)) return false;
  return extractMessages(body).some((m) => /jwt|token (expired|not found)|no token provided/i.test(m));
}

let loggingOut = false;

function handleAuthFailure() {
  if (loggingOut) return;
  loggingOut = true;
  // logout() clears local state even if its own API call fails.
  Promise.resolve(useAuthStore.getState().logout()).finally(() => {
    loggingOut = false;
    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  });
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON-serialisable body, or FormData for uploads. */
  body?: unknown;
  /** Query string parameters; undefined/null values are skipped. */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Send without Authorization and skip the auto-logout on auth errors. */
  public?: boolean;
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.append(key, String(value));
  }
  const qs = params.toString();
  if (!qs) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${qs}`;
}

/**
 * Performs a request and returns the parsed JSON envelope.
 * Throws ApiError with the server's own message on failure.
 */
export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { body, query, public: isPublic = false, headers: extraHeaders, ...init } = options;
  const { token, currentWorkspace } = useAuthStore.getState();

  const headers = new Headers(extraHeaders);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!isPublic && token) headers.set('Authorization', `Bearer ${token}`);
  if (currentWorkspace?._id) headers.set('X-Workspace-ID', currentWorkspace._id);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Network error. Check your connection and try again.', 0);
  }

  if (response.status === 204) {
    return { status: 'success', data: null as T };
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    // Non-JSON body; handled below.
  }

  if (!isPublic && isAuthFailure(response.status, json)) {
    handleAuthFailure();
    throw new ApiError('Your session has expired. Please sign in again.', 401, json);
  }

  if (!response.ok || isFailedEnvelope(json)) {
    const message = extractMessages(json)[0] || response.statusText || 'Something went wrong.';
    throw new ApiError(message, response.ok ? 400 : response.status, json);
  }

  return json as ApiEnvelope<T>;
}

/** Convenience helpers that return only `data`. */
export const http = {
  get: async <T>(path: string, options?: RequestOptions) =>
    (await request<T>(path, { ...options, method: 'GET' })).data,
  post: async <T>(path: string, body?: unknown, options?: RequestOptions) =>
    (await request<T>(path, { ...options, method: 'POST', body })).data,
  put: async <T>(path: string, body?: unknown, options?: RequestOptions) =>
    (await request<T>(path, { ...options, method: 'PUT', body })).data,
  delete: async <T>(path: string, options?: RequestOptions) =>
    (await request<T>(path, { ...options, method: 'DELETE' })).data,
  upload: async <T>(path: string, formData: FormData, options?: RequestOptions) =>
    (await request<T>(path, { ...options, method: 'POST', body: formData })).data,
};
