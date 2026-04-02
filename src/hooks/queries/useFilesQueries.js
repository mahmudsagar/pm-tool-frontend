import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl, documentBaseUrl } from '@/utils/constants';

/**
 * Query hook to get a specific document by ID
 */
export const useDocument = (documentId) => {
  return useQuery({
    queryKey: ['documents', documentId],
    queryFn: async () => {
      const result = await api.get(`${documentBaseUrl}?id=${documentId}`);
      return result.data;
    },
    enabled: !!documentId,
    staleTime: 2 * 60 * 1000, // 2 minutes - documents change more frequently
  });
};

/**
 * Query hook to list documents by page id
 */
export const useDocuments = (pageId) => {
  return useQuery({
    queryKey: ['documents', 'list', pageId],
    queryFn: async () => {
      const result = await api.get(`${documentBaseUrl}?id=${pageId}`);
      return result.data;
    },
    enabled: !!pageId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Query hook to get all files with optional filters
 */
export const useFiles = (filters = {}) => {
  return useQuery({
    queryKey: ['files', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `${baseUrl}/v1/files?${params}` : `${baseUrl}/v1/files`;
      const result = await api.get(url);
      return result.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

/**
 * Query hook to get file/folder by ID
 */
export const useFileById = (fileId) => {
  return useQuery({
    queryKey: ['files', fileId],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/files/${fileId}`);
      return result.data;
    },
    enabled: !!fileId,
  });
};

/**
 * Query hook to get folder contents by ID
 */
export const useFolderContents = (folderId) => {
  return useQuery({
    queryKey: ['folders', folderId, 'contents'],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/folder?id=${folderId}`);
      return result.data;
    },
    enabled: !!folderId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Query hook to get group contents by ID
 */
export const useGroupContents = (groupId) => {
  return useQuery({
    queryKey: ['groups', groupId, 'contents'],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/group?id=${groupId}`);
      return result.data;
    },
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Query hook to get space contents by ID
 */
export const useSpaceContents = (spaceId) => {
  return useQuery({
    queryKey: ['spaces', spaceId, 'contents'],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/space?id=${spaceId}`);
      return result.data;
    },
    enabled: !!spaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
