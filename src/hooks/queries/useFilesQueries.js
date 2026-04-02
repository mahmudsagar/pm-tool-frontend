import { useQuery } from '@tanstack/react-query';
import { baseUrl, documentBaseUrl } from '@/utils/constants';

/**
 * Query hook to get a specific document by ID
 */
export const useDocument = (documentId) => {
  return useQuery({
    queryKey: ['documents', documentId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${documentBaseUrl}?id=${documentId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch document');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${documentBaseUrl}?id=${pageId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch documents');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(filters).toString();
      const url = params ? `${baseUrl}/v1/files?${params}` : `${baseUrl}/v1/files`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch files');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/files/${fileId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch file');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/folder?id=${folderId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch folder contents');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/group?id=${groupId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch group contents');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/space?id=${spaceId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch space contents');
      const result = await response.json();
      return result.data;
    },
    enabled: !!spaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
