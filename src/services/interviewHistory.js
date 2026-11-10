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

export const mergeInterviewSessions = (serverSessions = [], localSessions = []) => {
  const merged = [...serverSessions];
  const identities = new Set(merged.map((session) => String(session.session_id ?? session.sessionId ?? session.id ?? '')).filter(Boolean));

  localSessions.forEach((session) => {
    const identity = String(session.session_id ?? session.sessionId ?? session.id ?? '');
    if (!identity || !identities.has(identity)) {
      merged.push(session);
      if (identity) identities.add(identity);
    }
  });

  return merged.sort((left, right) => {
    const leftDate = Date.parse(left.interview_date || left.completed_at || left.completedAt || '');
    const rightDate = Date.parse(right.interview_date || right.completed_at || right.completedAt || '');
    if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) return rightDate - leftDate;
    if (Number.isFinite(rightDate)) return 1;
    if (Number.isFinite(leftDate)) return -1;
    return 0;
  });
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
