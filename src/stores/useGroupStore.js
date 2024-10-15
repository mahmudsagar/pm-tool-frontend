import { createWithEqualityFn } from "zustand/traditional";

const useGroupStore = createWithEqualityFn((set, get) => ({
  groupData: null,
  loading: { group: false, delete: false },
  error: { group: null, delete: null },

  // Fetch group data
  fetchGroupData: async () => {
    set((state) => ({
      loading: { ...state.loading, group: true },
      error: { ...state.error, group: null },
    }));
    try {
      const response = await fetch(
        "https://better-notion-api-server.onrender.com/v1/group?user_id=66cda5dac6886719e3345c19"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch group data");
      }
      const result = await response.json();
      set((state) => ({
        groupData: result.data,
        loading: { ...state.loading, group: false },
      }));
    } catch (error) {
      set((state) => ({
        error: { ...state.error, group: error.message },
        loading: { ...state.loading, group: false },
      }));
    }
  },

  // Get Group Using Space Id
  getGroupSpaceId: (spaceID) => {
    const data = get().groupData;
    if (!data) return "Empty";

    const filteredGroups = data.filter(
      (group) => group.space_id === spaceID
    );

    if (filteredGroups.length === 0) return "Empty";
    return filteredGroups;
  },

  // Delete group
  deleteGroup: async (id) => {
    set((state) => ({
      loading: { ...state.loading, delete: true },
      error: { ...state.error, delete: null },
    }));
    try {
      const response = await fetch(
        `https://better-notion-api-server.onrender.com/v1/group?user_id=${id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete group");
      }

      // Update groupData after deletion
      set((state) => ({
        groupData: state.groupData?.filter((item) => item.id !== id),
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

export default useGroupStore;
