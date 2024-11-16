import { createWithEqualityFn } from "zustand/traditional";
import { Folder, File } from 'lucide-react';

const BASE_USER_ID = "66cda5dac6886719e3345c19";
const API_BASE_URL = "https://better-notion-api-server.onrender.com/v1";

const useFileManagerStore = createWithEqualityFn((set, get) => ({
  publicSpaces: null,
  privateSpaces: null,

  error: null,
  users: null, // store user api data
  teams: null, // store team api data
  spaces: null, // store space api data
  documents: {}, // store document api data
  tLoading: false,

  // Space data formatting is categorized into two types: public and private.
  formatSpaces: (data) => {    
    set(
      (data || []).reduce(
        (acc, space) => {
          acc[space.is_private ? 'privateSpaces' : 'publicSpaces'].push(space);
          return acc;
        },
        { privateSpaces: [], publicSpaces: [] }
      )
    );
  },

  // Store single document by clicking.
  storeDocuments: (data, id) => {
    set((state) => ({
      documents: { ...state.documents, [id]: data }
    }));
  },

  // Define the reusable apiRequest function with direct access to set and get
  apiRequest: async (url, method = 'GET', data = null) => {
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
            throw new Error(errorData?.message || 'Something went wrong!');
        }

        const responseData = await response.json();
                
        return { data: responseData?.data, error: null };
    } catch (error) {
        return { data: null, error: error?.message };
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

  // Get Document Data
  fatchDocument: async (id, type) => {

    let endPoint;
    if (type === "folder"){
      endPoint = `/folder?id=${id}`;
    } else if (type === "group"){
      endPoint = `/group?id=${id}`;      
    } else {
      return { error: "Invalid filetype specified" };
    }

    try {
      const { data, error } = await get().apiRequest(`${API_BASE_URL}${endPoint}`, 'GET');
  
      if (error) {
        return { error };
      }
      
      set((state) => ({
        documents: {
          ...state.documents,
          [id]: data,
        }
      }));
  
    } catch (error) {
      return { error: error.message };
    }
  },

  // Add Document Data
  postDocument: async (data) => {
    let endpoint, newDocumentData;

    if (data.filetype === "file") {
      endpoint = "/page/document";
      newDocumentData = {
        user_id: "66cda5dac6886719e3345c19",
        title: data.title,
        page_type: data.page_type,
        content: {
          text: "This is the document content"
        },
        summary: "This is the document summary",
        last_updated_by: "66cda5dac6886719e3345c19",
        custom_meta: {
          author: "John Doe",
          keywords: ["sample", "page", "meta"]
        },
        folder_id: data.type === "folder" ? data.id : '',
        group_id: data.type === "group" ? data.id : '',
        space_id: data.type === "space" ? data.id : '',
        attachments: []
      };
    } else if (data.filetype === "folder" || data.filetype === "group") {
      endpoint = data.filetype === "folder" ? "/folder" : "/group";
      newDocumentData = {
        user_id: "66cda5dac6886719e3345c19",
        entity_type: data.filetype,
        name: data.title,
        shared_members: data.shared_members,
        shared_teams: data.shared_teams,
        folder_id: data.type === "folder" ? data.id : '',
        group_id: data.type === "group" ? data.id : '',
        space_id: data.type === "space" ? data.id : '',
      };
    } else {
      return { error: "Invalid filetype specified" };
    }

    try {
      const { data: responseData, error } = await get().apiRequest(`${API_BASE_URL}${endpoint}`, 'POST', newDocumentData);

      console.log(responseData);
      

      if (error) {
        return { error };
      }

      // Update the appropriate state based on filetype
      set((state) => {
        if (data.filetype === "file") {
          return {
            documents: {
              ...state.documents,
              [data.id]: [...(state.documents[data.id] || []), responseData],
            },
          };
        } else {
          // Find the space, update the child's array, and replace it in the array
          const updatedSpaces = state.spaces.map(space => {
            if (space._id === data.space_id) {
              const updatedChilds = [...(space.childs || []), responseData];
              return { ...space, childs: updatedChilds }; // Update child nodes
            }
            return space;
          });

          return { spaces: updatedSpaces }; // Set directly updated array
        }
      });

      return { error: null };

    } catch (error) {
      return { error: error.message };
    }
  },

  // Delete Folder, File, and Group
  removeData: async (id, type) => {    
    let endPoint;
    if (type === "page") {
      endPoint = `/page/document?id=${id}`;
    } else if (type === "folder"){
      endPoint = `/folder?id=${id}`;
    } else if (type === "group"){
      endPoint = `/group?id=${id}`;      
    } else {
      return { error: "Invalid filetype specified" };
    }

    try {
      const { data: responseData, error } = await get().apiRequest(`${API_BASE_URL}${endPoint}`, 'DELETE');
  
      if (error) {
        return { error };
      }

      set((state) => {
        // Update documents state
        let updatedDocuments = { ...state.documents };
        if (type === "document") {
            Object.keys(updatedDocuments).forEach((key) => {
                updatedDocuments[key] = updatedDocuments[key].filter((doc) => doc._id !== id);
            });
        }

        // Update spaces state
        let updatedSpaces = state.spaces.map((space) => {
            const updatedChilds = space.childs.filter((child) => child._id !== id);
            return { ...space, childs: updatedChilds };
        });

        return {
            documents: updatedDocuments,
            spaces: updatedSpaces
        };
      });

  
      return { error: null };
  
    } catch (error) {
      return { error: error.message };
    }
  },

  // Get Users Data
  fetchUsers: async () => {
    const { data, error } = await get().apiRequest(`${API_BASE_URL}/user`, 'GET');
    if (error) {
      set({ error });
    } else {
      set({ users: data });      
    }
  },

  // Format Users data for MultiSelect input option
  formatUserInput: () => {
    const userData = get().users;    
    if (!userData) return [];

    return userData.map((user) => ({
      value: user._id,
      label: user.full_name,
    }));
  },

  // Get Teams Data
  fetchTeams: async () => {
    const { data, error } = await get().apiRequest(`${API_BASE_URL}/team?user_id=${BASE_USER_ID}`, 'GET');
    if (error) {
      set({ error });
    } else {
      set({ teams: data });
    }
  },

  // Format Teams data for MultiSelect input option
  formatTeamInput: () => {
    const teamData = get().teams;
    if (!teamData) return [];

    return teamData.map((team) => ({
      value: team._id,
      label: team.name,
    }));
  },

  getRelativeTime: (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);
    const diffInDays = Math.floor(diffInSeconds / 86400); // Calculate difference in days

    // If more than 24 hours have passed, show the date in "Month Day, Year" format
    if (diffInDays >= 1) {
      return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const timeIntervals = [
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'second', seconds: 1 }
    ];

    for (const interval of timeIntervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count >= 1) {
        return count === 1
          ? `a ${interval.label} ago`
          : `${count} ${interval.label}s ago`;
      }
    }

    return 'a moment ago';
  },

  // Get the User data By ID
  getUserById: async (id) => {
    try {
      const { data, error } = await get().apiRequest(`${API_BASE_URL}/user?id=${id}`, 'GET');
      if (error) {
        return { error };
      }
      return data;
    } catch (error) {
      return { error: error.message };
    }
  },

  // Formated Data for Table row
  formatTableData: async (id, type) => {
    let endPoint;
    if (type === "folder") {
      endPoint = `/folder?id=${id}`;
    } else if (type === "group") {
      endPoint = `/group?id=${id}`;      
    } else {
      return { error: "Invalid filetype specified" };
    }
  
    try {
      const { data, error } = await get().apiRequest(`${API_BASE_URL}${endPoint}`, 'GET');
      if (error) {
        return { error };
      }
  
      const transformedData = await Promise.all(data[0].childs.map(async (child) => {
        const result = await get().getUserById(child.user_id);        
        const modifiedUser = result?.full_name || 'Unknown User';
  
        return {
          id: child._id,
          type: child.entity_type,
          icon: child.entity_type === 'folder' ? Folder : File,
          name: child.entity_type === 'folder' ? child.name : `${child.title}.${child.page_type}`,
          modified: get().getRelativeTime(child.updatedAt),
          modifiedBy: modifiedUser,
          sharing: data[0].is_private ? 'Public' : 'Private',
        };
      }));
  
      return transformedData;
    } catch (error) {
      return { error: error.message };
    }
  }

}));

export default useFileManagerStore;