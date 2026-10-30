import axios from 'axios';

// In development, Vite proxies /resume-api to http://127.0.0.1:8000.
// For deployment, set VITE_RESUME_API_URL to the reachable backend base URL.
const resumeRoleApi = axios.create({
  baseURL: import.meta.env.VITE_RESUME_API_URL || '/resume-api',
  timeout: 60000,
  headers: { Accept: 'application/json' },
});

resumeRoleApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
    || localStorage.getItem('access_token')
    || localStorage.getItem('token');

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const analyzeResumeWithBackend = (file, email) => {
  const formData = new FormData();
  formData.append('file', file);

  if (email) {
    formData.append('email', email);
  }

  return resumeRoleApi.post('/resume/analyze', formData);
};

export const discoverRolesFromResume = (resumeText) =>
  resumeRoleApi.post('/roles/discover', { resume_text: resumeText });

export const getRoleRequirements = (role, resumeText) =>
  resumeRoleApi.post('/roles/requirements', {
    role,
    resume_text: resumeText,
  });

export default resumeRoleApi;
