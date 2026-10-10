// Legacy entry point kept for existing callers; new code should import from '@/lib/api/client'.
// Each helper resolves to the full response envelope ({ status, message, data }).
import { request } from '@/lib/api/client';

export const api = {
  get: (url, options) => request(url, { ...options, method: 'GET' }),
  post: (url, data, options) => request(url, { ...options, method: 'POST', body: data }),
  put: (url, data, options) => request(url, { ...options, method: 'PUT', body: data }),
  delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
  upload: (url, formData, options) => request(url, { ...options, method: 'POST', body: formData }),
  deleteMedia: (url, options) => request(url, { ...options, method: 'DELETE' }),
};
