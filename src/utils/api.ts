import useAuthStore from '@/store/useAuthStore';

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

// Track if a token refresh is in progress
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Function to refresh the token
const refreshToken = async (): Promise<string | null> => {
  const token = useAuthStore.getState().token;
  
  if (!token) return null;
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    useAuthStore.getState().login(data.token);
    return data.token;
  } catch (error) {
    useAuthStore.getState().logout();
    return null;
  }
};

async function fetcher<T = any>(
  url: string, 
  options: FetchOptions = { requireAuth: true }
): Promise<T> {
  const { requireAuth = true, ...fetchOptions } = options;
  const token = useAuthStore.getState().token;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add authorization header if token exists and auth is required
  if (requireAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Handle unauthorized errors with token refresh
  if (response.status === 401 && requireAuth) {
    // Try to refresh the token if we're not already doing so
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshToken();
    }
    
    // Wait for the refresh to complete
    const newToken = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;
    
    if (newToken) {
      // Retry the request with the new token
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers,
      });
      
      if (!retryResponse.ok) {
        throw new Error(`API Error: ${retryResponse.statusText}`);
      }
      
      // Return null for 204 No Content responses
      if (retryResponse.status === 204) {
        return null as T;
      }
      
      return retryResponse.json();
    } else {
      // If refresh failed, logout and redirect (handled by AuthGuard)
      throw new Error('Authentication expired. Please log in again.');
    }
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  // Return null for 204 No Content responses
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const api = {
  get: <T = any>(url: string, options?: FetchOptions) => 
    fetcher<T>(url, { ...options, method: 'GET' }),
    
  post: <T = any>(url: string, data: any, options?: FetchOptions) => 
    fetcher<T>(url, { ...options, method: 'POST', body: JSON.stringify(data) }),
    
  put: <T = any>(url: string, data: any, options?: FetchOptions) => 
    fetcher<T>(url, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    
  delete: <T = any>(url: string, options?: FetchOptions) => 
    fetcher<T>(url, { ...options, method: 'DELETE' }),
};
