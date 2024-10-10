import { create } from "zustand";

// Base API URL
const API_BASE_URL = "https://better-notion-api-server.onrender.com/v1";

// Helper function to handle API fetch
const apiFetch = async (url, method = "GET") => {
  const options = { method };
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorMsg = `Failed to ${
      method === "DELETE" ? "delete" : "fetch"
    } data`;
    throw new Error(errorMsg);
  }

  return await response.json();
};

// Zustand Store
const useDataStore = create((set, get) => ({
  folderData: null,
  spaceData: null,
  loading: { folder: false, space: false, delete: false },
  error: { folder: null, space: null, delete: null },

  // Set loading and error states
  setLoadingAndError: (type, isLoading, error = null) => {
    set((state) => ({
      loading: { ...state.loading, [type]: isLoading },
      error: { ...state.error, [type]: error },
    }));
  },

  // Fetch folder data
  fetchFolderData: async () => {
    const setLoadingAndError = get().setLoadingAndError;
    setLoadingAndError("folder", true);

    try {
      const result = await apiFetch(
        `${API_BASE_URL}/folder?user_id=66cda5dac6886719e3345c19`
      );
      set((state) => ({
        folderData: result.data,
        loading: { ...state.loading, folder: false },
      }));
    } catch (error) {
      setLoadingAndError("folder", false, error.message);
    }
  },

  // Fetch space data
  fetchSpaceData: async () => {
    const setLoadingAndError = get().setLoadingAndError;
    setLoadingAndError("space", true);

    try {
      const result = await apiFetch(
        `${API_BASE_URL}/space?user_id=66cda5dac6886719e3345c19`
      );
      set((state) => ({
        spaceData: result.data.sort((a, b) => b.is_private - a.is_private),
        loading: { ...state.loading, space: false },
      }));
    } catch (error) {
      setLoadingAndError("space", false, error.message);
    }
  },

  // Get folders by space ID
  getFolderSpaceId: (spaceID) => {
    const folderData = get().folderData;
    if (!folderData) return "Empty";

    const filteredFolders = folderData.filter(
      (folder) => folder.space_id === spaceID
    );

    return filteredFolders.length ? filteredFolders : "Empty";
  },

  // Delete folder or space
  deleteItem: async (type, id) => {
    const setLoadingAndError = get().setLoadingAndError;
    const itemType = type === "folder" ? "folderData" : "spaceData";

    setLoadingAndError("delete", true);

    try {
      await apiFetch(`${API_BASE_URL}/${type}?id=${id}`, "DELETE");

      // Update state after deletion
      set((state) => ({
        [itemType]: state[itemType].filter((item) => item.id !== id),
        loading: { ...state.loading, delete: false },
      }));
    } catch (error) {
      setLoadingAndError("delete", false, error.message);
    }
  },
}));

export default useDataStore;
