import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, buildUrl, extractMessages, http, request } from './client';
import useAuthStore from '@/stores/useAuthStore';
import { failure, jsonResponse, mockFetch, success } from '@/test/http';

const signIn = () =>
  useAuthStore.setState({
    token: 'tok-123',
    isAuthenticated: true,
    user: { _id: 'u1', name: 'Ada', email: 'ada@test.dev' },
    currentWorkspace: { _id: 'ws1', name: 'Acme', owner_id: 'u1' },
  });

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, currentWorkspace: null, isAuthenticated: false, workspaces: [] });
});

describe('extractMessages', () => {
  it('flattens the nested envelope, including zod error arrays', () => {
    expect(extractMessages(failure('Space not found'))).toEqual(['Space not found']);
    expect(extractMessages({ status: 'failed', message: [{ error: [['name required', 'email invalid']] }] })).toEqual([
      'name required',
      'email invalid',
    ]);
    expect(extractMessages(success(null), 'success')).toEqual(['ok']);
    expect(extractMessages(null)).toEqual([]);
  });
});

describe('buildUrl', () => {
  it('prefixes the API base and skips empty query values', () => {
    expect(buildUrl('/v1/space', { id: 'a b', user_id: undefined, n: 0 })).toBe('http://api.test/v1/space?id=a+b&n=0');
  });

  it('leaves absolute URLs alone and appends to an existing query', () => {
    expect(buildUrl('http://x.test/v1/a?x=1', { y: 2 })).toBe('http://x.test/v1/a?x=1&y=2');
  });
});

describe('request', () => {
  it('sends auth and workspace headers and returns the envelope', async () => {
    signIn();
    const fetchMock = mockFetch(jsonResponse(success([{ _id: 's1' }])));

    const result = await request('/v1/space');

    expect(result.data).toEqual([{ _id: 's1' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/v1/space');
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer tok-123');
    expect(headers.get('X-Workspace-ID')).toBe('ws1');
  });

  it('JSON-encodes bodies but leaves FormData for the browser to encode', async () => {
    signIn();
    const fetchMock = mockFetch(jsonResponse(success(1)), jsonResponse(success(2)));

    await http.post('/v1/a', { a: 1 });
    await http.upload('/v1/b', new FormData());

    const [, jsonInit] = fetchMock.mock.calls[0];
    expect(jsonInit.body).toBe('{"a":1}');
    expect((jsonInit.headers as Headers).get('Content-Type')).toBe('application/json');
    const [, formInit] = fetchMock.mock.calls[1];
    expect(formInit.body).toBeInstanceOf(FormData);
    expect((formInit.headers as Headers).has('Content-Type')).toBe(false);
  });

  it('throws ApiError carrying the server message and status', async () => {
    signIn();
    mockFetch(jsonResponse(failure('Space not found'), 404));

    const error = await request('/v1/space').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Space not found');
    expect(error.status).toBe(404);
    expect(error.isNotFound).toBe(true);
  });

  it('treats a 200 with a failed envelope as an error', async () => {
    signIn();
    mockFetch(jsonResponse(failure('Name is required')));
    await expect(request('/v1/folder')).rejects.toThrow('Name is required');
  });

  it('logs out once on auth failure, including JWT errors sent as 400', async () => {
    signIn();
    const logout = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });
    mockFetch(jsonResponse(failure('jwt expired'), 400), jsonResponse(failure('Invalid token'), 401));

    const results = await Promise.allSettled([request('/v1/a'), request('/v1/b')]);

    expect(results.every((r) => r.status === 'rejected' && (r.reason as ApiError).status === 401)).toBe(true);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('does not log out on auth errors from public endpoints', async () => {
    const logout = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });
    mockFetch(jsonResponse(failure('Incorrect password.'), 401));

    await expect(request('/v1/auth/login', { method: 'POST', public: true, body: {} })).rejects.toThrow('Incorrect password.');
    expect(logout).not.toHaveBeenCalled();
  });

  it('reports network failures with a readable message', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(request('/v1/a', { public: true })).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/network/i) });
  });

  it('returns null data for 204 responses', async () => {
    signIn();
    mockFetch(new Response(null, { status: 204 }));
    expect(await http.delete('/v1/a')).toBeNull();
  });
});
