import { createWithEqualityFn } from "zustand/traditional";

const useSpaceStore = createWithEqualityFn((set) => ({
  spaceData: null,
  loading: { space: false, delete: false },
  error: { space: null, delete: null },

  // Fetch space data
  fetchSpaceData: async () => {
    set((state) => ({
      loading: { ...state.loading, space: true },
      error: { ...state.error, space: null },
    }));
    try {
      const response = await fetch(
        "https://better-notion-api-server.onrender.com/v1/space?user_id=66cda5dac6886719e3345c19"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch space data");
      }
      const result = await response.json();
      set((state) => ({
        spaceData: result?.data?.sort((a, b) => b.is_private - a.is_private),
        loading: { ...state.loading, space: false },
      }));
    } catch (error) {
      set((state) => ({
        error: { ...state.error, space: error.message },
        loading: { ...state.loading, space: false },
      }));
    }
  },

  // Delete space
  deleteSpace: async (id) => {
    set((state) => ({
      loading: { ...state.loading, delete: true },
      error: { ...state.error, delete: null },
    }));
    try {
      const response = await fetch(
        `https://better-notion-api-server.onrender.com/v1/space/${id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete space");
      }

      // Update spaceData after deletion
      set((state) => ({
        spaceData: state.spaceData?.filter((item) => item.id !== id),
        loading: { ...state.loading, delete: false },
      }));
    } catch (error) {
      set((state) => ({
        error: { ...state.error, delete: error.message },
        loading: { ...state.loading, delete: false },
      }));
    }
  },
}));

export default useSpaceStore;
