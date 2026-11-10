const KEY = 'skillengine:pendingAssessment';
export const PENDING_ASSESSMENT_EVENT = 'skillengine:pending-assessment';

export interface PendingAssessment {
  token: string;
  receivedAt: string;
  unseen: boolean;
}

const notify = () => {
  try {
    window.dispatchEvent(new Event(PENDING_ASSESSMENT_EVENT));
  } catch {
    // ignore
  }
};

export const getPendingAssessment = (): PendingAssessment | null => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    return value && typeof value.token === 'string' && value.token ? value : null;
  } catch {
    return null;
  }
};

export const setPendingAssessment = (token: string): void => {
  if (!token) return;
  try {
    const current = getPendingAssessment();
    const next: PendingAssessment = {
      token,
      receivedAt: current?.token === token ? current.receivedAt : new Date().toISOString(),
      unseen: true,
    };
    localStorage.setItem(KEY, JSON.stringify(next));
    notify();
  } catch {
    // storage unavailable
  }
};

export const markPendingAssessmentSeen = (): void => {
  try {
    const current = getPendingAssessment();
    if (!current || !current.unseen) return;
    localStorage.setItem(KEY, JSON.stringify({ ...current, unseen: false }));
    notify();
  } catch {
    // ignore
  }
};

export const clearPendingAssessment = (token?: string): void => {
  try {
    const current = getPendingAssessment();
    if (!current) return;
    if (token && current.token !== token) return;
    localStorage.removeItem(KEY);
    notify();
  } catch {
    // ignore
  }
};

export const assessmentStartPath = (token: string): string =>
  `/exam/${encodeURIComponent(token)}?proceed=1`;
