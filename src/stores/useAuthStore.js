import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      loading: false,

      // Auth actions
      setLoading: (loading) => set({ loading }),

      login: async (email, password) => {
        set({ loading: true });
        try {
          const response = await fetch(import.meta.env.BN_BASE_URL + '/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Login failed");
          }

          const responseData = await response.json();
          
          if (responseData.status === "success" && responseData.data) {
            const token = responseData.data.token;
            const user = responseData.data.user_info;
            
            set({ 
              token, 
              user, 
              isAuthenticated: true,
              loading: false
            });
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            return { success: true };
          } else {
            throw new Error("Invalid response format");
          }
        } catch (error) {
          set({ loading: false });
          return { success: false, error: error.message };
        }
      },

      register: async (email, password, name) => {
        set({ loading: true });
        try {
          const response = await fetch(import.meta.env.BN_BASE_URL + '/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Registration failed");
          }

          const responseData = await response.json();
          
          if (responseData.status === "success" && responseData.data) {
            const token = responseData.data.token;
            const user = responseData.data.user_info;
            
            set({ 
              token, 
              user, 
              isAuthenticated: true,
              loading: false
            });
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            return { success: true, message: responseData.message };
          } else {
            throw new Error("Invalid response format");
          }
        } catch (error) {
          set({ loading: false });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        const token = get().token;
        set({ loading: true });
        
        try {
          // Call logout API
          await fetch(import.meta.env.BN_BASE_URL + '/v1/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (error) {
          console.error('Logout API error:', error);
        } finally {
          // Clear state regardless of API result
          set({ 
            token: null, 
            user: null, 
            isAuthenticated: false,
            loading: false
          });
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
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
