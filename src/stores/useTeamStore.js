import { createWithEqualityFn } from "zustand/traditional";

const useTeamStore = createWithEqualityFn((set, get) => ({
  teamData: null,
  loading: { team: false, delete: false },
  error: { team: null, delete: null },

  // Fetch all team data
  fetchTeamData: async () => {
    set((state) => ({
      loading: { ...state.loading, team: true },
      error: { ...state.error, team: null },
    }));
    try {
      const response = await fetch(
        "https://better-notion-api-server.onrender.com/v1/team?user_id=66cda5dac6886719e3345c19"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch team data");
      }
      const result = await response.json();
      set((state) => ({
        teamData: result.data,
        loading: { ...state.loading, team: false },
      }));
    } catch (error) {
      set((state) => ({
        error: { ...state.error, team: error.message },
        loading: { ...state.loading, team: false },
      }));
    }
  },

  // Get team by ID
  getTeamById: (teamId) => {
    const data = get().teamData;
    return data?.find((team) => team._id === teamId) || null;
  },

  // Delete team
  deleteTeam: async (id) => {
    set((state) => ({
      loading: { ...state.loading, delete: true },
      error: { ...state.error, delete: null },
    }));
    try {
      const response = await fetch(
        `https://better-notion-api-server.onrender.com/v1/team/${id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete team`);
      }

      // Update state
      set((state) => ({
        teamData: state.teamData?.filter((item) => item._id !== id),
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

export default useTeamStore;
