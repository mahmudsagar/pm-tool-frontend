import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAuthStore from './useAuthStore';
import { queryClient } from '@/lib/queryClient';
import { failure, jsonResponse, mockFetch, success } from '@/test/http';

const user = { _id: 'u1', name: 'Ada', email: 'ada@test.dev' };
const owned = { _id: 'ws1', name: 'Mine', owner_id: 'u1' };
const shared = { _id: 'ws2', name: 'Theirs', owner_id: 'u9' };

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, workspaces: [], currentWorkspace: null, isAuthenticated: false, loading: false });
  queryClient.clear();
});

describe('login', () => {
  it('starts a session and derives workspace roles', async () => {
    mockFetch(jsonResponse(success({ token: 'tok', user_info: user, workspaces: [owned, shared] })));

    const result = await useAuthStore.getState().login('ada@test.dev', 'pw');

    expect(result).toEqual({ success: true });
    const state = useAuthStore.getState();
    expect(state).toMatchObject({ token: 'tok', isAuthenticated: true, loading: false, user });
    expect(state.workspaces.map((w) => w.role)).toEqual(['owner', 'member']);
    expect(state.currentWorkspace?._id).toBe('ws1');
    expect(state.isOwner()).toBe(true);
  });

  it("returns the server's message on failure and stays signed out", async () => {
    mockFetch(jsonResponse(failure('Incorrect password.'), 401));

    const result = await useAuthStore.getState().login('ada@test.dev', 'nope');

    expect(result).toEqual({ success: false, error: 'Incorrect password.' });
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, token: null, loading: false });
  });
});

describe('loginWithToken (OAuth callback)', () => {
  it('validates the token with /v1/auth and keeps it', async () => {
    const fetchMock = mockFetch(jsonResponse(success({ user_info: user, workspaces: [owned] })));

    const result = await useAuthStore.getState().loginWithToken('oauth-tok');

    expect(result.success).toBe(true);
    expect(useAuthStore.getState().token).toBe('oauth-tok');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/v1/auth');
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer oauth-tok');
  });
});

describe('workspace switching', () => {
  it('clears cached server data only when the workspace actually changes', () => {
    useAuthStore.setState({ currentWorkspace: { ...owned, role: 'owner' } });
    const clear = vi.spyOn(queryClient, 'clear');

    useAuthStore.getState().setCurrentWorkspace({ ...owned, name: 'Renamed', role: 'owner' });
    expect(clear).not.toHaveBeenCalled();

    useAuthStore.getState().setCurrentWorkspace({ ...shared, role: 'member' });
    expect(clear).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isOwner()).toBe(false);
  });

  it('keeps the selected workspace when the server refreshes the session', () => {
    useAuthStore.setState({ user, currentWorkspace: { ...shared, role: 'member' }, workspaces: [] });

    useAuthStore.getState().applyServerSession({ user_info: { ...user, name: 'Ada L.' }, workspaces: [owned, shared] });

    const state = useAuthStore.getState();
    expect(state.currentWorkspace?._id).toBe('ws2');
    expect(state.user?.name).toBe('Ada L.');
    expect(state.workspaces).toHaveLength(2);
  });

  it('falls back to the first workspace if the selected one was removed', () => {
    useAuthStore.setState({ user, currentWorkspace: { _id: 'gone', name: 'Gone', owner_id: 'x' } });
    useAuthStore.getState().applyServerSession({ user_info: user, workspaces: [owned] });
    expect(useAuthStore.getState().currentWorkspace?._id).toBe('ws1');
  });
});

describe('logout', () => {
  it('clears the session even if the API call fails', async () => {
    useAuthStore.setState({ token: 'tok', user, isAuthenticated: true, currentWorkspace: owned, workspaces: [owned] });
    mockFetch(new TypeError('Failed to fetch'));

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null, isAuthenticated: false, workspaces: [], currentWorkspace: null });
  });
});
