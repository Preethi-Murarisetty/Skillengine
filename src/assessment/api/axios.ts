import axios from 'axios';
import { ASSESSMENT_API_BASE_URL } from '../config';

export const api = axios.create({
  baseURL: ASSESSMENT_API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

let sessionToken: string | null = null;
/** Optional bearer token issued by the backend after key verification (if it issues one). */
export const setSessionToken = (t: string | null) => { sessionToken = t; };

const startTimes = new WeakMap<object, number>();
const DEV = import.meta.env.DEV;

api.interceptors.request.use((cfg) => {
  if (sessionToken) cfg.headers.set('Authorization', `Bearer ${sessionToken}`);
  if (DEV) startTimes.set(cfg, performance.now());
  return cfg;
});

// Never log bodies (may contain keys / hidden test cases) or JWTs embedded in URLs.
const redact = (url = '') => url.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '{TOKEN}');
const log = (cfg: { method?: string; url?: string }, status: number | string, t0?: number) =>
  console.debug(
    `[API] REQUEST | METHOD ${cfg.method?.toUpperCase()} | URL ${redact(cfg.url)} | STATUS ${status} | ${t0 ? Math.round(performance.now() - t0) : '?'}ms`,
  );

api.interceptors.response.use(
  (res) => { if (DEV) log(res.config, res.status, startTimes.get(res.config)); return res; },
  (err) => {
    if (DEV && err.config) log(err.config, err.response?.status ?? 'NETWORK_ERROR', startTimes.get(err.config));
    return Promise.reject(err);
  },
);
