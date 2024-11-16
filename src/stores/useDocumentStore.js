import { createWithEqualityFn } from "zustand/traditional";

const useDocumentStore = createWithEqualityFn((set, get) => ({
  documentData: null,
  loading: { document: false, delete: false },
  error: { document: null, delete: null },

  // Fetch document data
  fetchDocumentData: async () => {
    set((state) => ({
      loading: { ...state.loading, document: true },
      error: { ...state.error, document: null },
    }));
    try {
      const response = await fetch(
        "https://better-notion-api-server.onrender.com/v1/page/document?user_id=66cda5dac6886719e3345c19"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch document data");
      }
      const result = await response.json();
      set((state) => ({
        documentData: result.data,
        loading: { ...state.loading, document: false },
      }));
    } catch (error) {
      set((state) => ({
        error: { ...state.error, document: error.message },
        loading: { ...state.loading, document: false },
      }));
    }
  },

  // Get Document by user_id and folder_id (from pageMeta)
  getDocumentByIds: (user_id, folder_id) => {
    const data = get().documentData;
    if (!data) return "Empty";

    const filteredDocuments = data.filter(
      (document) =>
        document.user_id === user_id &&
        document.pageMeta?.folder_id === folder_id
    );

    if (filteredDocuments.length === 0) return "Empty";
    return filteredDocuments;
  },

  // Add new document
  addNewDocument: async (newData, folderId) => {
    const newDocumentData = {
      user_id: "66cda5dac6886719e3345c19",
      content: {
          text: "This is the document content"
      },
      summary: "This is the document summary",
      page_types: newData.type,
      title: "Sample Page Title",
      folder_id: "66e404cf089aef7c495015f4",
      custom_meta: {
          author: "John Doe",
          keywords: ["sample", "page", "meta"]
      },
      shared_teams: [
          "66cda5dac6886719e3345c19",
          "66e404cf089aef7c495015f4"
      ],
      shared_members: [
          "66cda5dac6886719e3345c19",
          "66e404cf089aef7c495015f4"
      ],
      space_id: "66e4064f658c25f499aa9d63",
      group_id: "66e4064f658c25f499aa9d63",
      attachments: "attachment_url"
    }   

    set((state) => ({
      loading: { ...state.loading, add: true },
      error: { ...state.error, add: null },
    }));
    try {
      const response = await fetch(
        "https://better-notion-api-server.onrender.com/v1/page/document",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newDocumentData),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to add new document");
      }
      const result = await response.json();

      // Update state
      set((state) => ({
        documentData: state.documentData ? [...state.documentData, result.data] : [result.data],
        loading: { ...state.loading, add: false },
      }));
    } catch (error) {
      set((state) => ({
        error: { ...state.error, add: error.message },
        loading: { ...state.loading, add: false },
      }));
    }
  },

  // Delete document
  deleteDocument: async (id) => {
    set((state) => ({
      loading: { ...state.loading, delete: true },
      error: { ...state.error, delete: null },
    }));
    try {
      const response = await fetch(
        `https://better-notion-api-server.onrender.com/v1/page/document?id=${id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete document`);
      }

      // Update state
      set((state) => ({
        documentData: state.documentData?.filter((item) => item._id !== id),
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

export default useDocumentStore;