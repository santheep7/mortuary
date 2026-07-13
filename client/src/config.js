// Central API config — all pages should import from here
// Falls back to '/api' if the env var is not set
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';
