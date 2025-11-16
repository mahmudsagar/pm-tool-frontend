import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token, user) => {
        set({ 
          token, 
          user, 
          isAuthenticated: true 
        });
        // Also update localStorage for compatibility with existing code
        if (token) localStorage.setItem('token', token);
        if (user) localStorage.setItem('user', JSON.stringify(user));
      },

      logout: () => {
        set({ 
          token: null, 
          user: null, 
          isAuthenticated: false 
        });
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      },

      setToken: (token) => {
        set({ token, isAuthenticated: !!token });
        if (token) localStorage.setItem('token', token);
      },

      setUser: (user) => {
        set({ user });
        if (user) localStorage.setItem('user', JSON.stringify(user));
      },

      // Initialize from localStorage on mount
      initializeAuth: () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        if (token && user) {
          set({ token, user, isAuthenticated: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore;
