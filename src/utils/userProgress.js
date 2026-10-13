const STORAGE_VERSION = 1;
const MAX_HISTORY_ITEMS = 100;

const getUserIdentifier = (user) => {
  const id = user?.id ?? user?.user_id ?? user?.userId;
  if (id !== undefined && id !== null && String(id).trim()) {
    return `id:${String(id).trim()}`;
  }

  const email = String(user?.email || '').trim().toLowerCase();
  return email ? `email:${email}` : '';
};

const storageKey = (user) => {
  const identifier = getUserIdentifier(user);
  return identifier
    ? `skillEngineProgress:${encodeURIComponent(identifier)}`
    : '';
};

const emptyProgress = () => ({
  version: STORAGE_VERSION,
  assessments: [],
  practiceSessions: [],
});

const attemptIdentity = (attempt) => attempt.attemptId
  ? `attempt:${attempt.attemptId}`
  : `assessment:${attempt.assessmentId || 'unknown'}:${attempt.attemptNumber ?? ''}:${attempt.submittedAt || ''}`;

const newestFirst = (left, right, dateField, numberField) => {
  const leftTime = Date.parse(left[dateField] || '');
  const rightTime = Date.parse(right[dateField] || '');
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return rightTime - leftTime;
  const leftNumber = Number(left[numberField]);
  const rightNumber = Number(right[numberField]);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) return rightNumber - leftNumber;
  return 0;
};

export const readUserProgress = (user) => {
  const key = storageKey(user);
  if (!key) return emptyProgress();

  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    if (parsed?.version !== STORAGE_VERSION) return emptyProgress();

    return {
      version: STORAGE_VERSION,
      assessments: Array.isArray(parsed.assessments) ? parsed.assessments : [],
      practiceSessions: Array.isArray(parsed.practiceSessions) ? parsed.practiceSessions : [],
    };
  } catch {
    return emptyProgress();
  }
};

const writeUserProgress = (user, progress) => {
  const key = storageKey(user);
  if (!key) return false;

  try {
    localStorage.setItem(key, JSON.stringify(progress));
    window.dispatchEvent(new Event('skillengine:progress-updated'));
    return true;
  } catch {
    return false;
  }
};

export const recordPracticeSession = (user, session) => {
  if (!getUserIdentifier(user) || !Number.isFinite(Number(session?.percentage))) {
    return false;
  }

  const progress = readUserProgress(user);
  const newSession = {
      id: session.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: String(session.category || 'Practice'),
      score: Number(session.score) || 0,
      maxScore: Number(session.maxScore) || 0,
      percentage: Math.min(100, Math.max(0, Number(session.percentage))),
      answered: Number(session.answered) || 0,
      completedAt: session.completedAt || new Date().toISOString(),
    };
  const practiceSessions = [
    newSession,
    ...progress.practiceSessions,
  ].filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index)
    .sort((left, right) => newestFirst(left, right, 'completedAt', 'attemptNumber'))
    .slice(0, MAX_HISTORY_ITEMS);

  return writeUserProgress(user, { ...progress, practiceSessions });
};

export const recordAssessmentResult = (user, candidateEmail, result) => {
  const userEmail = String(user?.email || '').trim().toLowerCase();
  const verifiedCandidateEmail = String(candidateEmail || '').trim().toLowerCase();
  const percentage = Number(result?.percentage);
  const attemptId = String(result?.attemptId || '').trim();
  const attemptNumber = Number(result?.attemptNumber);
  const submittedAt = String(result?.submittedAt || '').trim();

  if (
    !getUserIdentifier(user) ||
    !userEmail ||
    !verifiedCandidateEmail ||
    userEmail !== verifiedCandidateEmail ||
    !Number.isFinite(percentage) ||
    (!attemptId && !Number.isFinite(attemptNumber) && !submittedAt)
  ) {
    return false;
  }

  const progress = readUserProgress(user);
  const assessment = {
    assessmentId: String(result.assessmentId || ''),
    attemptId,
    attemptNumber: Number.isFinite(attemptNumber) ? attemptNumber : null,
    candidateId: String(result.candidateId || user.id || user.user_id || user.userId || ''),
    title: String(result.title || 'Assessment'),
    score: result.score !== null && result.score !== undefined && result.score !== '' && Number.isFinite(Number(result.score)) ? Number(result.score) : null,
    maxScore: result.maxScore !== null && result.maxScore !== undefined && result.maxScore !== '' && Number.isFinite(Number(result.maxScore)) ? Number(result.maxScore) : null,
    percentage: Math.min(100, Math.max(0, percentage)),
    status: String(result.status || 'Completed'),
    submittedAt: submittedAt || '',
    sections: Array.isArray(result.sections) ? result.sections : [],
  };
  const identity = attemptIdentity(assessment);
  const assessments = [
    assessment,
    ...progress.assessments.filter((item) => {
      return attemptIdentity(item) !== identity;
    }),
  ].sort((left, right) => newestFirst(left, right, 'submittedAt', 'attemptNumber'))
    .slice(0, MAX_HISTORY_ITEMS);

  return writeUserProgress(user, { ...progress, assessments });
};
