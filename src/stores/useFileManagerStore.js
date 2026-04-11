import { createWithEqualityFn } from "zustand/traditional";
import { formatTime } from "@/utils/helper";
import {
  File,
  Users,
  Folder,
  FileText,
  StickyNote,
  FileSpreadsheet,
  LayoutGrid,
} from "lucide-react";

const API_BASE_URL = import.meta.env.BN_BASE_URL + "/v1";

const useFileManagerStore = createWithEqualityFn((set, get) => ({
  users: null,
  documents: {},
  spaceFiles: null,
  publicSpaces: null,
  privateSpaces: null,
  space: null,
  error: null,

  // Add loading states for spaces
  isSpacesLoading: false,
  hasInitializedSpaces: false,
  // Set loading state
  setSpacesLoading: (loading) => set({ isSpacesLoading: loading }),

  // Set initialization state
  setInitializedSpaces: (value) => set({ hasInitializedSpaces: value }),

  // Initialize empty spaces (fallback)
  initializeEmptySpaces: () => {
    set({
      publicSpaces: [],
      privateSpaces: [],
      spaceFiles: [],
      hasInitializedSpaces: true,
      isSpacesLoading: false,
    });
  },

  // This will be called when fetching spaces from API (for existing users or after space operations)
  syncSpacesFromAPI: async (userId) => {
    set({ isSpacesLoading: true });

    try {
      const { data, error } = await get().apiRequest(
        `${API_BASE_URL}/space?user_id=${userId}`,
        "GET"
      );

      if (error) {
        console.error("Error syncing spaces:", error);
        set({ isSpacesLoading: false, error });
        return { error };
      }

      // Format and update spaces
      if (data && Array.isArray(data)) {
        get().formatSpaces(data);
        set({ isNewUser: false }); // User now has real spaces
      } else {
        get().initializeEmptySpaces();
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error in syncSpacesFromAPI:", error);
      set({ isSpacesLoading: false, error: error.message });
      return { error: error.message };
    }
  },

  // Function to create a space and then sync
  createSpaceAndSync: async (spaceData) => {
    console.log("Creating space and syncing:", spaceData);

    try {
      const { data, error } = await get().apiRequest(
        `${API_BASE_URL}/space`,
        "POST",
        spaceData
      );

      if (error) {
        console.error("Error creating space:", error);
        return { error };
      }

      // After successful creation, sync all spaces to get updated data
      await get().syncSpacesFromAPI(spaceData.user_id);

      return { success: true, data };
    } catch (error) {
      console.error("Error in createSpaceAndSync:", error);
      return { error: error.message };
    }
  },

  // Function to update a space and then sync
  updateSpaceAndSync: async (spaceId, updateData, userId) => {
    console.log("Updating space and syncing:", { spaceId, updateData });

    try {
      const { data, error } = await get().apiRequest(
        `${API_BASE_URL}/space?id=${spaceId}`,
        "PUT",
        updateData
      );

      if (error) {
        console.error("Error updating space:", error);
        return { error };
      }

      // After successful update, sync all spaces to get updated data
      await get().syncSpacesFromAPI(userId);

      return { success: true, data };
    } catch (error) {
      console.error("Error in updateSpaceAndSync:", error);
      return { error: error.message };
    }
  },

  // Function to delete a space and then sync
  deleteSpaceAndSync: async (spaceId, userId) => {
    console.log("Deleting space and syncing:", spaceId);

    try {
      const { data, error } = await get().apiRequest(
        `${API_BASE_URL}/space?id=${spaceId}`,
        "DELETE"
      );

      if (error) {
        console.error("Error deleting space:", error);
        return { error };
      }

      // After successful deletion, sync all spaces to get updated data
      await get().syncSpacesFromAPI(userId);

      return { success: true, data };
    } catch (error) {
      console.error("Error in deleteSpaceAndSync:", error);
      return { error: error.message };
    }
  },

  // Space data formatting is categorized into two types: public and private.
  formatSpaces: (data) => {
    // Handle empty or null data
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log("No spaces data found, initializing empty state");
      get().initializeEmptySpaces();
      return;
    }

    const categorizedSpaces = {
      privateSpaces: [],
      publicSpaces: [],
    };

    const allChildFiles = data
      .flatMap((space) => {
        // console.log("Processing space:", space);

        if (!Array.isArray(space.childs)) return [];

        const target = space.is_private ? "privateSpaces" : "publicSpaces";

        // Sort children: pinned first, then unpinned
        const sortedChilds = space.childs.sort((a, b) => {
          // If both have same pinned status, maintain original order
          if (a.pinned === b.pinned) return 0;
          // Pinned items come first (true > false when converted to number)
          return b.pinned - a.pinned;
        });

        // Propagate is_private from the parent space to each child so that
        // children of private spaces are always treated as private.
        const childsWithPrivacy = sortedChilds.map((child) => ({
          ...child,
          is_private: space.is_private ?? child.is_private,
        }));

        categorizedSpaces[target].push({
          ...space,
          childs: childsWithPrivacy,
        });

        return childsWithPrivacy;
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    set({
      spaceFiles: get().convertTableFormat(allChildFiles),
      privateSpaces: categorizedSpaces.privateSpaces,
      publicSpaces: categorizedSpaces.publicSpaces,
      hasInitializedSpaces: true,
      isSpacesLoading: false,
    });
  },

  // Store single document by clicking.
  storeDocuments: (data, id) => {
    set((state) => ({
      documents: { ...state.documents, [id]: data },
    }));
  },

  // Universal function to store data into any state
  storeState: (key, data) => {
    set((state) => ({
      // Update the specific state based on the key
      [key]: data,
    }));
  },

  // Method to reset initialization flag (useful for logout)
  resetInitialization: () => {
    console.log("Resetting file manager store");
    set({
      hasInitializedSpaces: false,
      isSpacesLoading: false,
      publicSpaces: null,
      privateSpaces: null,
      spaceFiles: null,
      documents: {},
      users: null,
      space: null,
      error: null,
    });
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
        spaces?.map((space) => ({
          ...space,
          childs: (space.childs || []).filter(
            (child) => !(child._id === id && child.entity_type === type)
          ),
        })) || [];

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
                childs: [
                  ...(updatedDocuments[key][groupIndex].childs || []),
                  newData,
                ],
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
        spaces?.map((space) => {
          // If the current space matches the id and type OR has a child that matches, proceed
          if (space._id === id && space.entity_type === type) {
            return {
              ...space,
              childs: [
                ...space.childs,
                newData.entity_type === "page"
                  ? newData
                  : { ...newData, childs: [] },
              ],
            };
          }

          // Check if we're dealing with a nested child scenario
          if (
            space.childs &&
            space.childs.some(
              (child) => child._id === id && child.entity_type === type
            )
          ) {
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
                      newData.entity_type === "page"
                        ? newData
                        : { ...newData, childs: [] },
                    ],
                  };
                }
                return child;
              }),
            };
          }

          return space;
        }) || [];

      // Adding data to the childs array in documents
      const updatedDocuments = addToDocumentsChilds(state.documents);

      // Adding data to publicSpaces, but avoid adding if it's inside a folder/group
      const updatedPublicSpaces = addChild(state.publicSpaces);

      // Adding data to privateSpaces, but avoid adding if it's inside a folder/group
      const updatedPrivateSpaces = addChild(state.privateSpaces);

      // Also update spaceFiles so the home page list stays in sync.
      // spaceFiles contains direct children of spaces — add the new item when
      // its parent is a space (not a nested folder/group).
      let updatedSpaceFiles = state.spaceFiles;
      if (type === 'space' && Array.isArray(state.spaceFiles)) {
        // Inherit is_private from the parent space so the new item is correctly
        // shown as Private/Public without waiting for a full sync.
        const allSpaces = [
          ...(state.publicSpaces || []),
          ...(state.privateSpaces || []),
        ];
        const parentSpace = allSpaces.find((s) => s._id === id);
        const newDataWithPrivacy = {
          ...newData,
          is_private: parentSpace?.is_private ?? newData.is_private,
        };
        const [formatted] = get().convertTableFormat([newDataWithPrivacy]);
        if (formatted) {
          updatedSpaceFiles = [formatted, ...state.spaceFiles];
        }
      }

      // Return updated state
      return {
        documents: updatedDocuments,
        publicSpaces: updatedPublicSpaces,
        privateSpaces: updatedPrivateSpaces,
        spaceFiles: updatedSpaceFiles,
      };
    });
  },

  // Update functionality for File, Folder, and Group
  updateHandler: (id, type, updatedData) => {
    set((state) => {
      // Helper function to update an item in documents
      const updateInDocuments = (documents) => {
        const updatedDocuments = { ...documents };

        // Iterate through all documents to find and update the target
        Object.keys(updatedDocuments).forEach((key) => {
          updatedDocuments[key] = updatedDocuments[key].map((item) => {
            if (item._id === id && item.entity_type === type) {
              // For pages we update the title, for folders/groups we update the name
              const updatedItem = { ...item };
              if (type === "page" && updatedData.title) {
                updatedItem.title = updatedData.title;
              } else if (
                (type === "folder" || type === "group") &&
                updatedData.name
              ) {
                updatedItem.name = updatedData.name;
              }
              // Update any other fields that might have changed
              return { ...updatedItem, ...updatedData };
            }
            return item;
          });

          // Also check child items
          updatedDocuments[key] = updatedDocuments[key].map((item) => {
            if (item.childs && Array.isArray(item.childs)) {
              return {
                ...item,
                childs: item.childs.map((child) => {
                  if (child._id === id && child.entity_type === type) {
                    const updatedChild = { ...child };
                    if (type === "page" && updatedData.title) {
                      updatedChild.title = updatedData.title;
                    } else if (
                      (type === "folder" || type === "group") &&
                      updatedData.name
                    ) {
                      updatedChild.name = updatedData.name;
                    }
                    return { ...updatedChild, ...updatedData };
                  }
                  return child;
                }),
              };
            }
            return item;
          });
        });

        return updatedDocuments;
      };

      // Helper function to update items in spaces
      const updateInSpaces = (spaces) => {
        return (
          spaces?.map((space) => {
            // Check if this space has the item directly
            if (space._id === id && space.entity_type === type) {
              return { ...space, ...updatedData };
            }

            // Check for the item in child elements
            if (space.childs && Array.isArray(space.childs)) {
              return {
                ...space,
                childs: space.childs.map((child) => {
                  if (child._id === id && child.entity_type === type) {
                    const updatedChild = { ...child };
                    if (type === "page" && updatedData.title) {
                      updatedChild.title = updatedData.title;
                    } else if (
                      (type === "folder" || type === "group") &&
                      updatedData.name
                    ) {
                      updatedChild.name = updatedData.name;
                    }
                    return { ...updatedChild, ...updatedData };
                  }
                  return child;
                }),
              };
            }

            return space;
          }) || []
        );
      };

      // Update documents, publicSpaces, and privateSpaces
      const updatedDocuments = updateInDocuments(state.documents);
      const updatedPublicSpaces = updateInSpaces(state.publicSpaces);
      const updatedPrivateSpaces = updateInSpaces(state.privateSpaces);

      // Also update spaceFiles if it exists and is an array
      let updatedSpaceFiles = state.spaceFiles;
      if (Array.isArray(updatedSpaceFiles)) {
        updatedSpaceFiles = updatedSpaceFiles.map((file) => {
          if (file.id === id && file.type === type) {
            // Update the visible name in the file table
            const nameKey = type === "page" ? "title" : "name";
            return {
              ...file,
              name: updatedData[nameKey] || file.name,
              modified: formatTime(new Date()),
            };
          }
          return file;
        });
      }

      return {
        documents: updatedDocuments,
        publicSpaces: updatedPublicSpaces,
        privateSpaces: updatedPrivateSpaces,
        spaceFiles: updatedSpaceFiles,
      };
    });
  },

  // Toggle pin status for an item
  togglePinStatus: async (id, type, isPinned) => {
    try {
      let endpoint;

      if (type === "page") {
        endpoint = `/page/document?id=${id}`;
      } else if (type === "folder") {
        endpoint = `/folder?id=${id}`;
      } else if (type === "group") {
        endpoint = `/group?id=${id}`;
      } else if (type === "space") {
        endpoint = `/space?id=${id}`;
      } else {
        return { error: "Invalid filetype specified" };
      }

      const { data, error } = await get().apiRequest(
        `${API_BASE_URL}${endpoint}`,
        "PUT",
        { id, entity_type: type, pinned: isPinned }
      );

      if (error) {
        return { error };
      }

      // Update the store with the new pinned status
      set((state) => {
        // Helper function to update pin status in any collection
        const updatePinStatus = (items) => {
          if (!Array.isArray(items)) return items;

          return items.map((item) => {
            // If this is the target item, update its pin status
            if (item._id === id && item.entity_type === type) {
              return { ...item, pinned: isPinned };
            }

            // Also check in childs if they exist
            if (item.childs && Array.isArray(item.childs)) {
              const updatedChilds = item.childs.map((child) => {
                if (child._id === id && child.entity_type === type) {
                  return { ...child, pinned: isPinned };
                }
                return child;
              });

              // If we're pinning an item, make sure it's in the parent's childs list
              if (
                isPinned &&
                !updatedChilds.some(
                  (child) => child._id === id && child.entity_type === type
                )
              ) {
                // Try to find the item in spaceFiles to add it to the pinned items
                const itemToPin = state.spaceFiles?.find(
                  (file) => file.id === id && file.type === type
                );
                if (itemToPin) {
                  updatedChilds.push({
                    _id: id,
                    entity_type: type,
                    pinned: true,
                    name: type === "page" ? undefined : itemToPin.name,
                    title: type === "page" ? itemToPin.name : undefined,
                    // Add other necessary fields
                  });
                }
              }

              return {
                ...item,
                childs: updatedChilds,
              };
            }

            return item;
          });
        };

        // Update in all collections
        const updatedDocuments = { ...state.documents };
        Object.keys(updatedDocuments).forEach((key) => {
          updatedDocuments[key] = updatePinStatus(updatedDocuments[key]);
        });

        // Update the spaces with the new pin status
        const updatedPublicSpaces = updatePinStatus(state.publicSpaces);
        const updatedPrivateSpaces = updatePinStatus(state.privateSpaces);

        // Also update spaceFiles to reflect the pin status
        const updatedSpaceFiles = Array.isArray(state.spaceFiles)
          ? state.spaceFiles.map((file) => {
              if (file.id === id && file.type === type) {
                return { ...file, pinned: isPinned };
              }
              return file;
            })
          : state.spaceFiles;

        return {
          documents: updatedDocuments,
          publicSpaces: updatedPublicSpaces,
          privateSpaces: updatedPrivateSpaces,
          spaceFiles: updatedSpaceFiles,
        };
      });

      return { success: true, data };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Define the reusable apiRequest function with direct access to set and get
  apiRequest: async (url, method = "GET", data = null) => {
    try {
      // Get the token from localStorage
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      // Add the authorization header if token exists
      if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
      }

      // Add workspace header if a current workspace is selected
      try {
        const workspaceRaw = typeof window !== "undefined" ? localStorage.getItem("currentWorkspace") : null;
        const workspaceId = workspaceRaw ? JSON.parse(workspaceRaw)?._id : null;
        if (workspaceId) options.headers["X-Workspace-ID"] = workspaceId;
      } catch (_) { /* ignore parse errors */ }

      if (data && method !== "GET") {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.message || "Something went wrong!");
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
      const fileIcon =
        child.entity_type === "folder"
          ? Folder
          : child.entity_type === "group"
          ? Users
          : {
              document: FileText,
              whiteboard: StickyNote,
              sheet: FileSpreadsheet,
              board: LayoutGrid,
            }[child.page_type] || FileText;

      // Choose display name robustly: folders/groups use `name`, pages usually use `title`,
      // but board pages may use `name` on the backend. Fall back safely.
      let fileName = '';
      if (child.entity_type === 'folder' || child.entity_type === 'group') {
        fileName = child.name;
      } else if (child.page_type === 'board') {
        fileName = child.name || child.title || '';
      } else {
        fileName = child.title || child.name || '';
      }
      const usersArr = Array.isArray(get().users) ? get().users : [];
      const user = usersArr.find((user) => user._id === child.user_id);
      const modifiedUserName = user ? user.full_name : "Unknown User";

      return {
        id: child._id,
        type: child.entity_type,
        icon: fileIcon,
        name: fileName,
        modified: formatTime(child.updatedAt),
        modifiedBy: modifiedUserName,
        sharing: child.is_private ? "Private" : "Public",
        pinned: child.pinned,
        space_id: child.space_id,
        folder_id: child.folder_id || child.parent_id || null,
        group_id: child.group_id || null,
        page_type: child.page_type || null,
      };
    });
  },

  // Get the User data By ID
  getUserById: async (id) => {
    try {
      const { data, error } = await get().apiRequest(
        `${API_BASE_URL}/user?id=${id}`,
        "GET"
      );
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
      const { data, error } = await get().apiRequest(
        `${API_BASE_URL}${endPoint}`,
        "GET"
      );
      if (error) {
        return { error };
      }

      const transformedData = await Promise.all(
        data[0].childs.map(async (child) => {
          const result = await get().getUserById(child.user_id);
          const modifiedUser = result?.full_name || "Unknown User";
          console.log(child);

          return {
            id: child._id,
            type: child.entity_type,
            icon: child.entity_type === "folder" ? Folder : File,
            name:
              child.entity_type === "folder"
                ? child.name
                : child.page_type === 'board'
                ? (child.name || child.title || '')
                : (child.title ? `${child.title}.${child.page_type}` : (child.name || '')),
            modified: formatTime(child.updatedAt),
            modifiedBy: modifiedUser,
            sharing: data[0].is_private ? "Public" : "Private",
            pinned: child.pinned,
            space_id: child.space_id,
            folder_id: child.folder_id || child.parent_id || null,
            group_id: child.group_id || null,
            page_type: child.page_type || null,
          };
        })
      );

      return transformedData;
    } catch (error) {
      return { error: error.message };
    }
  },
}));

export default useFileManagerStore;