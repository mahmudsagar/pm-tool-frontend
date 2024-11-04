import { createWithEqualityFn } from "zustand/traditional";

const BASE_USER_ID = "66cda5dac6886719e3345c19";
const API_BASE_URL = "https://better-notion-api-server.onrender.com/v1";

const useFileManagerStore = createWithEqualityFn((set, get) => ({
  error: null,
  spaces: null, // sotre space api data
  loading: false,

  // Define the reusable apiRequest function with direct access to set and get
  apiRequest: async (url, method = 'GET', data = null) => {
    set({ loading: true });

    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Something went wrong');
        }

        const responseData = await response.json();
                
        return { data: responseData.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    } finally {
        set({ loading: false });
    }
  },

  // Get Space Data
  fetchSpace: async () => {
    const { data, error } = await get().apiRequest(`${API_BASE_URL}/space?user_id=${BASE_USER_ID}`, 'GET');
    if (error) {
      set({ error });
    } else {
      const result = data?.sort((a, b) => b.is_private - a.is_private)
      set({ spaces: result });
    }
  },


}));

export default useFileManagerStore;