import { createWithEqualityFn } from "zustand/traditional";

const useFolderStore = createWithEqualityFn((set, get) => ({
  folderData: null,
  loading: { folder: false, delete: false },
  error: { folder: null, delete: null },

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

  // Get Folder Using Space Id
  getFolderSpaceId: (spaceID) => {
    const data = get().folderData;
    if (!data) return "Empty";

    const filteredFolders = data.filter((folder) => folder.space_id === spaceID);
    if (filteredFolders.length === 0) return "Empty";
    return filteredFolders;
  },

  // Add new folder
  addNewFolder: async (newFolder, spaceId) => {
    const newFolderData = {
    name: newFolder.name,
    shared_members: [ newFolder.shared_members ],
    shared_teams: [ newFolder.shared_teams ],
    space_id: spaceId,
    type: newFolder.type,
    description: "This is a description of the folder.",
    parent_id: "66e4166256b7210ed8eae041",
    user_id: "66cda5dac6886719e3345c19",
    group_id: "66e415969462f5ae1f9095c3"
  };

    set((state) => ({
      loading: { ...state.loading, add: true },
      error: { ...state.error, add: null },
    }));
    try {
      const response = await fetch(
        "https://better-notion-api-server.onrender.com/v1/folder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newFolderData),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to add new folder");
      }

      const result = await response.json();
      set((state) => ({
        folderData: state.folderData ? [...state.folderData, result.data] : [result.data],
        loading: { ...state.loading, add: false },
      }));
    } catch (error) {
      set((state) => ({
        error: { ...state.error, add: error.message },
        loading: { ...state.loading, add: false },
      }));
    }
  },

  // Delete folder
  deleteFolder: async (id) => {
    set((state) => ({
      loading: { ...state.loading, delete: true },
      error: { ...state.error, delete: null },
    }));
    try {
      const response = await fetch(
        `https://better-notion-api-server.onrender.com/v1/folder?id=${id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete folder");
      }

      // Update folderData after deletion
      set((state) => ({
        folderData: state.folderData?.filter((item) => item.id !== id),
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

export default useFolderStore;
