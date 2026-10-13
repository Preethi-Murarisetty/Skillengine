import api from './api';

const CACHE_TTL_MS = 15000;
const interviewHistoryCache = new Map();

const getUserKey = (user) => {
  const id = user?.id ?? user?.user_id ?? user?.userId;
  if (id !== undefined && id !== null && String(id).trim()) return `id:${String(id).trim()}`;
  const email = String(user?.email || '').trim().toLowerCase();
  return email ? `email:${email}` : '';
};

const extractSessions = (response) => {
  const body = response?.data?.data ?? response?.data ?? {};
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.sessions)) return body.sessions;
  if (Array.isArray(body.interviews)) return body.interviews;
  return [];
};

export const getUserInterviewHistory = async (user) => {
  const key = getUserKey(user);
  if (!key) return [];

  const cached = interviewHistoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const entry = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    promise: null,
  };
  entry.promise = api.get('/interviews')
    .then(extractSessions)
    .catch((error) => {
      if (interviewHistoryCache.get(key) === entry) {
        interviewHistoryCache.delete(key);
      }
      throw error;
    });
  interviewHistoryCache.set(key, entry);
  return entry.promise;
};

export const invalidateUserInterviewHistory = (user) => {
  const key = getUserKey(user);
  if (key) interviewHistoryCache.delete(key);
};
