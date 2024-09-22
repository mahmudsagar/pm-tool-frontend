import { create } from "zustand";

const useDataStore = create((set, get) => ({
  folderData: null,
  spaceData: null,
  loading: { folder: false, space: false },
  error: { folder: null, space: null },

  // Fetch folder data
  fetchFolderData: async () => {
    set((state) => ({
      loading: { ...state.loading, folder: true },
      error: { ...state.error, folder: null },
    }));
    try {
      const response = await fetch(
        "https://better-notion-api-server.onrender.com/v1/folder?user_id=66cda5dac6886719e3345c19"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch folder data");
      }
      const result = await response.json();
      set((state) => ({
        folderData: result.data,
        loading: { ...state.loading, folder: false },
      }));
    } catch (error) {
      set((state) => ({
        error: { ...state.error, folder: error.message },
        loading: { ...state.loading, folder: false },
      }));
    }
  },

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

  // Get Folder Using Space Id
  getFolderSpaceId: (spaceID) => {
    const data = get().folderData;
    if (!data) return [];

    return data.filter((folder) => folder.space_id === spaceID);
  },
}));

export default useDataStore;
