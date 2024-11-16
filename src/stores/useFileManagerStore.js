import { createWithEqualityFn } from "zustand/traditional";
import { Folder, File } from 'lucide-react';

const API_BASE_URL = "https://better-notion-api-server.onrender.com/v1";

const useFileManagerStore = createWithEqualityFn((set, get) => ({
  documents: {},
  publicSpaces: null,
  privateSpaces: null,

  error: null,

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

  // Delete functionality for File, Folder 
  deleteHandler: (id, type) => {
    set((state) => {
      const updatedDocuments = { ...state.documents };
      Object.keys(updatedDocuments).forEach((key) => {
        updatedDocuments[key] = updatedDocuments[key].filter(
          (child) => !(child._id === id && child.entity_type === type)
        );
      });
  
      const removeChild = (spaces) =>
        spaces.map((space) => ({
          ...space,
          childs: space.childs.filter(
            (child) => !(child._id === id && child.entity_type === type)
          ),
        }));
  
      const updatedPublicSpaces = removeChild(state.publicSpaces);
      const updatedPrivateSpaces = removeChild(state.privateSpaces);
      return {
        documents: updatedDocuments,
        publicSpaces: updatedPublicSpaces,
        privateSpaces: updatedPrivateSpaces,
      };
    });
  },

  // Store new data functionality for File, Folder, and Group
  storeHandler: (id, type, newData) => {
    set((state) => {
      // Recursive helper function to add new data to the correct child in documents
      const addToDocumentsChilds = (documents) => {
        const updatedDocuments = { ...documents };
        
        Object.keys(updatedDocuments).forEach((key) => {
          if (key === id) {
            // Find the item by ID and type
            const itemIndex = updatedDocuments[key].findIndex(
              (item) => item._id === id && item.entity_type === type
            );
  
            if (itemIndex !== -1) {
              // Add newData to the childs array
              const updatedItem = {
                ...updatedDocuments[key][itemIndex],
                childs: [...(updatedDocuments[key][itemIndex].childs || []), newData],
              };
  
              // Update the item in the array
              updatedDocuments[key][itemIndex] = updatedItem;
            }
          }
        });
  
        return updatedDocuments;
      };
  
      // Recursive helper to locate and add new data in spaces (public or private)
      const addChildToSpaces = (spaces) =>
        spaces.map((space) => {
          if (space._id === id && space.entity_type === type) {
            return {
              ...space,
              childs: [...(space.childs || []), newData],
            };
          } else if (space.childs) {
            return {
              ...space,
              childs: addChildToSpaces(space.childs),
            };
          }
          return space;
        });
  
      // Updated state with new data added in the appropriate places
      return {
        documents: addToDocumentsChilds(state.documents),
        publicSpaces: addChildToSpaces(state.publicSpaces),
        privateSpaces: addChildToSpaces(state.privateSpaces),
      };
    });
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