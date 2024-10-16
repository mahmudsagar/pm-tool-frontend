import { createWithEqualityFn } from "zustand/traditional";

const useUserStore = createWithEqualityFn((set, get) => ({
  userData: null,
  loading: { user: false, delete: false },
  error: { user: null, delete: null },

  // Fetch all user data
  fetchUserData: async () => {
    set((state) => ({
      loading: { ...state.loading, user: true },
      error: { ...state.error, user: null },
    }));
    try {
      const response = await fetch("https://better-notion-api-server.onrender.com/v1/user");
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      const result = await response.json();
      set((state) => ({
        userData: result.data,
        loading: { ...state.loading, user: false },
      }));
    } catch (error) {
      set((state) => ({
        error: { ...state.error, user: error.message },
        loading: { ...state.loading, user: false },
      }));
    }
  },

  // Get user by ID
  getUserById: (userId) => {
    const data = get().userData;
    return data?.find((user) => user._id === userId) || null;
  },
}));

export default useUserStore;
