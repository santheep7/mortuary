// Central API config — all pages should import from here
// Falls back to '/api' if the env var is not set
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Get full URL for uploaded files (uploads are served directly, not via proxy)
export const getUploadUrl = (path) => {
  if (!path) return null;
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
  return `http://localhost:${backendPort}${path}`;
};
