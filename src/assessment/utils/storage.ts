import type { AssessmentSession } from '../types/assessment';

/**
 * Assessment session storage
 *
 * We use localStorage so that:
 *
 * /assessment/:token
 *
 * refresh chesina assessment session remain avutundi.
 *
 * We do NOT store secrets, hidden test cases,
 * or sensitive authentication credentials here.
 */

/* ============================================================
   STORAGE KEY
============================================================ */

const key = (token: string): string => {
  return `se_assessment_${token.slice(-24)}`;
};

/* ============================================================
   LOAD SESSION
============================================================ */

export const loadSession = (
  token: string,
): AssessmentSession | null => {
  try {
    if (!token) {
      return null;
    }

    const storageKey = key(token);

    const raw =
      localStorage.getItem(storageKey);

    if (!raw) {
      return null;
    }

    const session =
      JSON.parse(
        raw,
      ) as AssessmentSession;

    /*
     * Make sure the saved session belongs
     * to the current assessment URL token.
     */
    if (
      !session ||
      session.token !== token
    ) {
      return null;
    }

    return session;
  } catch (error) {
    console.error(
      'Failed to load assessment session:',
      error,
    );

    return null;
  }
};

/* ============================================================
   SAVE SESSION
============================================================ */

export const saveSession = (
  session: AssessmentSession,
): void => {
  try {
    if (
      !session ||
      !session.token
    ) {
      return;
    }

    const storageKey =
      key(session.token);

    localStorage.setItem(
      storageKey,
      JSON.stringify(session),
    );
  } catch (error) {
    console.error(
      'Failed to save assessment session:',
      error,
    );
  }
};

/* ============================================================
   CLEAR SESSION
============================================================ */

export const clearSession = (
  token: string,
): void => {
  try {
    if (!token) {
      return;
    }

    localStorage.removeItem(
      key(token),
    );
  } catch (error) {
    console.error(
      'Failed to clear assessment session:',
      error,
    );
  }
};