const canceledStatuses = new Set(['cancelled', 'canceled', 'incomplete', 'in_progress', 'started', 'expired', 'invalid']);

const timestampFor = (attempt) => {
  const value = attempt.completedAt ?? attempt.submittedAt ?? attempt.interviewDate;
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const dedupe = (attempts) => {
  const byId = new Map();
  attempts.forEach((attempt) => {
    const current = byId.get(attempt.id);
    if (!current || (timestampFor(attempt) ?? -1) > (timestampFor(current) ?? -1)) {
      byId.set(attempt.id, attempt);
    }
  });
  return [...byId.values()];
};

const orderAttempts = (attempts) => dedupe(attempts).sort((left, right) => {
  const leftTime = timestampFor(left);
  const rightTime = timestampFor(right);
  if (leftTime !== null && rightTime !== null && leftTime !== rightTime) return leftTime - rightTime;
  if (left.attemptNumber != null && right.attemptNumber != null && left.attemptNumber !== right.attemptNumber) {
    return left.attemptNumber - right.attemptNumber;
  }
  return 0;
});

const hasReliableOrder = (attempts) => attempts.length < 2 ||
  attempts.every((attempt) => timestampFor(attempt) !== null) ||
  attempts.every((attempt) => attempt.attemptNumber != null);

const completedReport = (attempt) => {
  const status = String(attempt.status || '').trim().toLowerCase();
  return attempt.result && !canceledStatuses.has(status);
};

const sectionKind = (value) => {
  const type = String(value || '').trim().toLowerCase();
  if (['mcq', 'multiple_choice', 'multiple-choice', 'quiz'].includes(type)) return 'mcq';
  if (['coding', 'code', 'programming'].includes(type)) return 'coding';
  return null;
};

export const assessmentCategoryAttempts = (assessments, category) => {
  const attempts = [];
  (assessments || []).forEach((report) => {
    if (!completedReport(report)) return;
    const relevantSections = (report.sections || []).filter((section) => sectionKind(section.section_type) === category);
    if (!relevantSections.length) return;
    if (relevantSections.some((section) => !Number.isFinite(Number(section.score)) || !Number.isFinite(Number(section.max_score)) || Number(section.max_score) <= 0)) return;

    const maxScore = relevantSections.reduce((sum, section) => sum + Number(section.max_score || 0), 0);
    const score = relevantSections.reduce((sum, section) => sum + Number(section.score || 0), 0);
    if (!(maxScore > 0)) return;
    const attemptId = report.attemptId || '';
    const assessmentId = String(report.assessmentId || '').trim();
    attempts.push({
      id: `${assessmentId || 'assessment-unidentified'}:${attemptId || report.submittedAt || ''}:${category}`,
      assessmentId,
      assessmentName: report.title || 'Assessment',
      attemptId: report.attemptId || '',
      attemptNumber: report.attemptNumber,
      completedAt: report.submittedAt || '',
      score,
      maxScore,
      percentage: Math.min(100, Math.max(0, (score / maxScore) * 100)),
      correct: relevantSections.some((section) => section.correct_count !== undefined)
        ? relevantSections.reduce((sum, section) => sum + Number(section.correct_count || 0), 0)
        : undefined,
      incorrect: relevantSections.some((section) => section.wrong_count !== undefined)
        ? relevantSections.reduce((sum, section) => sum + Number(section.wrong_count || 0), 0)
        : undefined,
      unanswered: relevantSections.some((section) => section.unanswered_count !== undefined)
        ? relevantSections.reduce((sum, section) => sum + Number(section.unanswered_count || 0), 0)
        : undefined,
      sections: relevantSections,
      status: report.status || 'Completed',
      canCompare: Boolean(assessmentId),
    });
  });
  return orderAttempts(attempts);
};

export const practiceCategoryAttempts = (sessions, category) => orderAttempts(
  (sessions || [])
    .filter((session) => String(session.category || '').trim().toLowerCase() === category.trim().toLowerCase())
    .filter((session) => Number.isFinite(Number(session.percentage)) && Number.isFinite(timestampFor(session)))
    .map((session) => ({
      id: String(session.id),
      assessmentId: category,
      assessmentName: category,
      attemptNumber: session.attemptNumber,
      completedAt: session.completedAt,
      score: Number(session.score),
      maxScore: Number(session.maxScore),
      percentage: Math.min(100, Math.max(0, Number(session.percentage))),
      status: 'Completed',
      canCompare: true,
    })),
);

export const interviewTopicAttempts = (sessions) => {
  const grouped = new Map();
  (sessions || []).forEach((session) => {
    const status = String(session.status || session.attempt_status || '').trim().toLowerCase();
    if (canceledStatuses.has(status)) return;
    const topic = String(session.topic || session.interview_type || '').trim();
    const rawScore = session.overall_score ?? session.score;
    if (rawScore === null || rawScore === undefined || rawScore === '') return;
    const score = Number(rawScore);
    const completedAt = session.interview_date || session.completed_at || session.ended_at || session.created_at;
    if (!topic || !Number.isFinite(score) || !Number.isFinite(Date.parse(completedAt || ''))) return;
    const hasReportedMaximum = session.max_score !== null && session.max_score !== undefined && session.max_score !== '';
    const maxScore = hasReportedMaximum ? Number(session.max_score) : 10;
    if (!Number.isFinite(maxScore) || maxScore <= 0) return;
    const attempt = {
      id: String(session.session_id ?? session.id ?? `${topic}:${completedAt}`),
      assessmentId: topic.toLowerCase(),
      assessmentName: topic,
      attemptId: String(session.session_id ?? session.id ?? ''),
      attemptNumber: Number.isFinite(Number(session.attempt_number)) ? Number(session.attempt_number) : null,
      completedAt,
      score,
      maxScore,
      percentage: Math.min(100, Math.max(0, (score / maxScore) * 100)),
      status: session.status || 'Completed',
      canCompare: true,
         technicalScore: Number.isFinite(Number(session.technical_score ?? session.technicalScore))
           ? Number(session.technical_score ?? session.technicalScore)
           : undefined,
         communicationScore: Number.isFinite(Number(session.communication_score ?? session.communicationScore))
           ? Number(session.communication_score ?? session.communicationScore)
           : undefined,
    };
    const list = grouped.get(topic.toLowerCase()) || { topic, attempts: [] };
    list.attempts.push(attempt);
    grouped.set(topic.toLowerCase(), list);
  });
  return [...grouped.values()].map((group) => {
    const attempts = orderAttempts(group.attempts);
    return { topic: group.topic, attempts, historyOrderReliable: hasReliableOrder(attempts) };
  });
};

export const compareLatestAttempts = (attempts) => {
  if (!attempts || attempts.length < 2) return null;
  const latest = attempts[attempts.length - 1];
  const previous = attempts[attempts.length - 2];
  if (!latest.canCompare || !previous.canCompare) return null;
  const datesAreReliable = timestampFor(latest) !== null && timestampFor(previous) !== null;
  const sequenceIsReliable = latest.attemptNumber != null && previous.attemptNumber != null;
  if (!datesAreReliable && !sequenceIsReliable) return null;
  if (sequenceIsReliable && latest.attemptNumber <= previous.attemptNumber) return null;
  const deltaScore = latest.score - previous.score;
  const deltaPercentagePoints = latest.percentage - previous.percentage;
  const sameMaximum = Number.isFinite(Number(latest.maxScore)) && Number(latest.maxScore) === Number(previous.maxScore);
  return { latest, previous, deltaScore: sameMaximum ? deltaScore : null, deltaPercentagePoints };
};

export const groupAssessmentAttempts = (attempts) => {
  const groups = new Map();
  attempts.forEach((attempt) => {
    const key = attempt.assessmentId || `unidentified:${attempt.id}`;
    const group = groups.get(key) || { id: key, name: attempt.assessmentName, canCompare: Boolean(attempt.assessmentId), attempts: [] };
    group.attempts.push(attempt);
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => {
    const attempts = orderAttempts(group.attempts);
    return { ...group, attempts, historyOrderReliable: hasReliableOrder(attempts) };
  });
};
