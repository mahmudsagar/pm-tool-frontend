import { createWithEqualityFn } from "zustand/traditional";
import { formatTime } from '@/utils/helper';
import { 
  File, 
  Users, 
  Folder,
  FileText,
  StickyNote,
  FileSpreadsheet,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.BN_BASE_URL + '/v1';

const useFileManagerStore = createWithEqualityFn((set, get) => ({
  users: null,
  documents: {},
  spaceFiles: null,
  publicSpaces: null,
  privateSpaces: null,
  space: null,

  error: null,

  // Space data formatting is categorized into two types: public and private.
  formatSpaces: (data) => {     
    const categorizedSpaces = {
      privateSpaces: [],
      publicSpaces: []
    };
  
    const allChildFiles = (data || []).flatMap(space => {
      if (!Array.isArray(space.childs)) return [];    
      const target = space.is_private ? 'privateSpaces' : 'publicSpaces';
      categorizedSpaces[target].push({ ...space, childs: space.childs.filter(item => item.pinned) });      
      return space.childs;
    }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
    set({
      spaceFiles: get().convertTableFormat(allChildFiles),
      privateSpaces: categorizedSpaces.privateSpaces,
      publicSpaces: categorizedSpaces.publicSpaces
    });
  },

  // Store single document by clicking.
  storeDocuments: (data, id) => {
    set((state) => ({
      documents: { ...state.documents, [id]: data }
    }));
  },

  // Universal function to store data into any state
  storeState: (key, data) => {
    set((state) => ({
      // Update the specific state based on the key
      [key]: data,
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

  // Obtain the data and convert it into a table format.
  convertTableFormat: (data) => {
    return (data || []).map((child) => {
      const fileIcon = child.entity_type === 'folder' ? Folder : child.entity_type === 'group' ? Users : { 
        document: FileText, 
        whiteboard: StickyNote, 
        sheet: FileSpreadsheet 
      }[child.page_type] || FileText;

      const fileName = child.entity_type === 'folder' || child.entity_type === 'group' ? child.name : child.title;
      const usersArr = Array.isArray(get().users) ? get().users : [];
      const user = usersArr.find(user => user._id === child.user_id);
      const modifiedUserName = user ? user.full_name : 'Unknown User';

      return {
        id: child._id,
        type: child.entity_type,
        icon: fileIcon,
        name: fileName,
        modified: formatTime(child.updatedAt),
        modifiedBy: modifiedUserName,
        sharing: child.is_private ? 'Private' : 'Public',
      };
    });
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
          modified: formatTime(child.updatedAt),
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