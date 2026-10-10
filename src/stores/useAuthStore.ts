import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '@/lib/queryClient';
import { http, ApiError } from '@/lib/api/client';
import useStatusStore from '@/stores/useStatusStore';
import useStore from '@/stores/store';
import type { AuthPayload, User, Workspace } from '@/types/models';

type Result = { success: true; message?: string } | { success: false; error: string };

interface AuthState {
  token: string | null;
  user: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (email: string, password: string) => Promise<Result>;
  register: (email: string, password: string, name: string) => Promise<Result>;
  /** Completes an OAuth sign-in using the token the server put in the callback URL. */
  loginWithToken: (token: string) => Promise<Result>;
  logout: () => Promise<void>;

  /** Applies a fresh server auth payload (from /v1/auth) without changing the token. */
  applyServerSession: (payload: AuthPayload) => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  isOwner: () => boolean;
}

const LEGACY_KEYS = ['token', 'user', 'workspaces', 'currentWorkspace'];

function withRoles(workspaces: Workspace[] | undefined, user: User): Workspace[] {
  return (workspaces ?? []).map((ws) => ({
    ...ws,
    role: ws.role ?? (ws.owner_id === user._id ? 'owner' : 'member'),
  }));
}

function pickWorkspace(workspaces: Workspace[], previous: Workspace | null): Workspace | null {
  return workspaces.find((ws) => ws._id === previous?._id) ?? workspaces[0] ?? null;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

/** Drops all cached server data and user-scoped client state. */
function clearUserData() {
  queryClient.clear();
  useStatusStore.getState().reset();
  useStore.getState().reset();
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const startSession = (token: string, payload: AuthPayload) => {
        const user = payload.user_info;
        const workspaces = withRoles(payload.workspaces, user);
        set({
          token,
          user,
          workspaces,
          currentWorkspace: pickWorkspace(workspaces, get().currentWorkspace),
          isAuthenticated: true,
          loading: false,
        });
      };

      const authenticate = async (run: () => Promise<{ token: string; payload: AuthPayload }>, fallback: string): Promise<Result> => {
        set({ loading: true });
        try {
          const { token, payload } = await run();
          if (!token || !payload?.user_info) throw new Error('Invalid response from server.');
          clearUserData();
          startSession(token, payload);
          return { success: true };
        } catch (error) {
          set({ loading: false });
          return { success: false, error: errorMessage(error, fallback) };
        }
      };

      return {
        token: null,
        user: null,
        workspaces: [],
        currentWorkspace: null,
        isAuthenticated: false,
        loading: false,

        login: (email, password) =>
          authenticate(async () => {
            const payload = await http.post<AuthPayload>('/v1/auth/login', { email, password }, { public: true });
            return { token: payload.token as string, payload };
          }, 'Login failed.'),

        register: (email, password, name) =>
          authenticate(async () => {
            const payload = await http.post<AuthPayload>('/v1/auth/register', { email, password, name }, { public: true });
            return { token: payload.token as string, payload };
          }, 'Registration failed.'),

        loginWithToken: (token) =>
          authenticate(async () => {
            const payload = await http.get<AuthPayload>('/v1/auth', {
              public: true,
              headers: { Authorization: `Bearer ${token}` },
            });
            return { token, payload };
          }, 'Sign-in failed.'),

        logout: async () => {
          const { token } = get();
          set({ loading: true });
          try {
            if (token) {
              await http.post('/v1/auth/logout', undefined, {
                public: true,
                headers: { Authorization: `Bearer ${token}` },
              });
            }
          } catch {
            // The local session is cleared regardless.
          } finally {
            set({
              token: null,
              user: null,
              workspaces: [],
              currentWorkspace: null,
              isAuthenticated: false,
              loading: false,
            });
            clearUserData();
          }
        },

        applyServerSession: (payload) => {
          const user = { ...(get().user ?? {}), ...payload.user_info } as User;
          const workspaces = payload.workspaces ? withRoles(payload.workspaces, user) : get().workspaces;
          const current = pickWorkspace(workspaces, get().currentWorkspace);
          if (current?._id !== get().currentWorkspace?._id) clearUserData();
          set({ user, workspaces, currentWorkspace: current });
        },

        setToken: (token) => set({ token, isAuthenticated: !!token }),

        setUser: (user) => set({ user }),

        setWorkspaces: (workspaces) => set({ workspaces }),

        setCurrentWorkspace: (workspace) => {
          const switching = workspace?._id !== get().currentWorkspace?._id;
          set({ currentWorkspace: workspace });
          // Every workspace has its own data; never show the previous one's cache.
          if (switching) clearUserData();
        },

        isOwner: () => get().currentWorkspace?.role === 'owner',
      };
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        workspaces: state.workspaces,
        currentWorkspace: state.currentWorkspace,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => () => {
        // Older builds duplicated the session under these keys.
        LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
      },
    },
  ),
);

export default useAuthStore;
