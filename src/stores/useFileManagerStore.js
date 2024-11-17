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
      // Helper function to add data to the correct childs array in documents
      const addToDocumentsChilds = (documents) => {
        const updatedDocuments = { ...documents };
  
        // Iterate over the documents' keys to find the matching ID
        Object.keys(updatedDocuments).forEach((key) => {
          if (key === id) {
            // Find the matching group object in the array
            const groupIndex = updatedDocuments[key].findIndex(
              (item) => item._id === id && item.entity_type === type
            );
  
            if (groupIndex !== -1) {
              // Update the childs array for the matched group
              const updatedGroup = {
                ...updatedDocuments[key][groupIndex],
                childs: [...(updatedDocuments[key][groupIndex].childs || []), newData],
              };
  
              // Replace the group object with the updated version
              updatedDocuments[key][groupIndex] = updatedGroup;
            }
          }
        });
  
        return updatedDocuments;
      };
  
      // Helper function to add a child element to a specific folder or group within a space
      const addChild = (spaces) =>
        spaces.map((space) => {
          // If the current space matches the id and type OR has a child that matches, proceed
          if (space._id === id && space.entity_type === type) {
            return {
              ...space,
              childs: [
                ...space.childs,
                newData.entity_type === "page" ? newData : { ...newData, childs: [] },
              ],
            };
          }
  
          // Check if we're dealing with a nested child scenario
          if (space.childs && space.childs.some((child) => child._id === id && child.entity_type === type)) {
            return {
              ...space,
              childs: space.childs.map((child) => {
                // Only update the target folder/group, not the parent space
                if (child._id === id && child.entity_type === type) {
                  return {
                    ...child,
                    // Ensure 'child.childs' is always an array
                    childs: [
                      ...(Array.isArray(child.childs) ? child.childs : []),
                      newData.entity_type === "page" ? newData : { ...newData, childs: [] },
                    ],
                  };
                }
                return child;
              }),
            };
          }
  
          return space;
        });
  
      // Adding data to the childs array in documents
      const updatedDocuments = addToDocumentsChilds(state.documents);
  
      // Adding data to publicSpaces, but avoid adding if it's inside a folder/group
      const updatedPublicSpaces = addChild(state.publicSpaces);
  
      // Adding data to privateSpaces, but avoid adding if it's inside a folder/group
      const updatedPrivateSpaces = addChild(state.privateSpaces);
  
      // Return updated state
      return {
        documents: updatedDocuments,
        publicSpaces: updatedPublicSpaces,
        privateSpaces: updatedPrivateSpaces,
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