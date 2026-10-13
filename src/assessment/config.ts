/**
 * One backend for the whole app. The Practice screens use VITE_BACKEND_URL
 * (see src/services/api.js); Assessment derives its API base from the same value
 * unless VITE_API_BASE_URL is set explicitly.
 */
const backend = (import.meta.env.VITE_BACKEND_URL || 'http://100.124.4.91:3005').replace(/\/+$/, '');

export const ASSESSMENT_API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || `${backend}/api`;
export const JUDGE0_URL: string = import.meta.env.VITE_JUDGE0_URL || 'http://localhost:2358';
