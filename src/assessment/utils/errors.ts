import axios from 'axios';

export class MissingEndpointError extends Error {
  constructor(public endpoint: string) {
    super(`Backend endpoint not configured: ${endpoint}`);
  }
}
export type ErrorKind =
  | 'invalid_token' | 'invalid_key' | 'not_started' | 'expired'
  | 'network' | 'session' | 'missing_endpoint' | 'unknown';

export const classifyError = (e: unknown): { kind: ErrorKind; message: string } => {
  if (e instanceof MissingEndpointError)
    return { kind: 'missing_endpoint', message: 'This step is not available yet. Please contact the assessment administrator.' };
  if (axios.isAxiosError(e)) {
    if (!e.response)
      return { kind: 'network', message: 'Unable to connect to the assessment server. Please check your internet connection and try again.' };
    const s = e.response.status;
    const text = JSON.stringify(e.response.data ?? '').toLowerCase();
    if (text.includes('not started') || text.includes('not yet'))
      return { kind: 'not_started', message: 'This assessment has not started yet.' };
    if (s === 410 || (text.includes('expired') && s !== 401))
      return { kind: 'expired', message: 'This assessment is no longer available.' };
    if (s === 401 || s === 403)
      return { kind: 'session', message: 'Your assessment session has expired.' };
    if (s === 404)
      return { kind: 'invalid_token', message: 'This assessment link is invalid or expired.' };
  }
  return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
};
