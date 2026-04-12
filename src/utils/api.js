import useAuthStore from '@/stores/useAuthStore';

// Checks if a parsed response body signals a JWT/auth error
const isJwtError = (json) => {
  if (!json) return false;
  // { status: "failed", message: [{error: ["jwt expired"]}] }
  if (json.status === 'failed') {
    const errors = json?.message?.flatMap(m => m?.error ?? []) ?? [];
    return errors.some(e => typeof e === 'string' && e.toLowerCase().includes('jwt'));
  }
  return false;
};

// Clears auth state and hard-redirects to login
const forceLogout = () => {
  useAuthStore.getState().logout();
  window.location.replace('/login');
};

// Track if a token refresh is in progress
let isRefreshing = false;
let refreshPromise = null;

// Function to refresh the token
const refreshToken = async () => {
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

async function fetcher(
  url, 
  options = { requireAuth: true }
) {
  const { requireAuth = true, ...fetchOptions } = options;
  const token = useAuthStore.getState().token;
  
  const currentWorkspace = useAuthStore.getState().currentWorkspace;

  const headers = {
    // Don't set Content-Type for FormData — the browser sets it with the boundary
    ...(!(fetchOptions.body instanceof FormData) && { 'Content-Type': 'application/json' }),
    ...fetchOptions.headers,
  };

  // Add authorization header if token exists and auth is required
  if (requireAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add workspace header if a current workspace is selected
  if (currentWorkspace?._id) {
    headers['X-Workspace-ID'] = currentWorkspace._id;
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
        return null;
      }
      
      return retryResponse.json();
    } else {
      // If refresh failed, logout and redirect (handled by AuthGuard)
      throw new Error('Authentication expired. Please log in again.');
    }
  }

  if (!response.ok) {
    // For 400/401 auth errors, parse the body to check for JWT expiry
    // The server sometimes sends 400 instead of 401 for expired tokens
    if (requireAuth && (response.status === 400 || response.status === 401)) {
      let body = null;
      try { body = await response.json(); } catch (_) { /* ignore parse errors */ }
      if (body) {
        const isAuthFailed = isJwtError(body);
        if (isAuthFailed) {
          forceLogout();
          throw new Error('Authentication expired. Please log in again.');
        }
      }
    }
    throw new Error(`API Error: ${response.statusText}`);
  }

  // Return null for 204 No Content responses
  if (response.status === 204) {
    return null;
  }

  const json = await response.json();

  // The server sometimes returns 200 with { status: "failed", message: [{error: ["jwt expired"]}] }
  // instead of a proper 401. Detect this and force logout.
  if (requireAuth && isJwtError(json)) {
    forceLogout();
    throw new Error('Authentication expired. Please log in again.');
  }

  return json;
}

export const api = {
  get: (url, options) => 
    fetcher(url, { ...options, method: 'GET' }),
    
  post: (url, data, options) => 
    fetcher(url, { ...options, method: 'POST', body: JSON.stringify(data) }),
    
  put: (url, data, options) => 
    fetcher(url, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    
  delete: (url, options) => 
    fetcher(url, { ...options, method: 'DELETE' }),

  // For multipart/form-data uploads — does NOT stringify the body
  upload: (url, formData, options) =>
    fetcher(url, { ...options, method: 'POST', body: formData }),

  // For deleting media resources
  deleteMedia: (url, options) =>
    fetcher(url, { ...options, method: 'DELETE' }),
};
