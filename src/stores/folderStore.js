import { create } from "zustand";

const useDataStore = create((set, get) => ({
  folderData: null,
  spaceData: null,
  loading: { folder: false, space: false, delete: false },
  error: { folder: null, space: null, delete: null },

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
    if (!data) return "Empty";

    const filteredFolders = data.filter(
      (folder) => folder.space_id === spaceID
    );

    if (filteredFolders.length === 0) return "Empty";
    return filteredFolders;
  },

  // Delete folder or space
  deleteItem: async (type, id) => {
    set((state) => ({
      loading: { ...state.loading, delete: true },
      error: { ...state.error, delete: null },
    }));
    try {
      const response = await fetch(
        `https://better-notion-api-server.onrender.com/v1/${type}/${id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete ${type}`);
      }

      // Update state based on type
      set((state) => {
        const updatedState =
          type === "folder"
            ? {
                folderData: state.folderData?.filter((item) => item.id !== id),
              }
            : {
                spaceData: state.spaceData?.filter((item) => item.id !== id),
              };

        return {
          ...updatedState,
          loading: { ...state.loading, delete: false },
        };
      });
    } catch (error) {
      set((state) => ({
        error: { ...state.error, delete: error.message },
        loading: { ...state.loading, delete: false },
      }));
    }
  },
}));

export default useDataStore;
