import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, ChartNoAxesCombined, ClipboardCheck, LoaderCircle, Mic2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInterviewHistory } from '../../hooks/useInterviewHistory';
import { readUserProgress } from '../../utils/userProgress';
import DashboardProgressBar from '../common/DashboardProgressBar';
import {
  assessmentCategoryAttempts,
  compareLatestAttempts,
  groupAssessmentAttempts,
  interviewTopicAttempts,
  practiceCategoryAttempts,
} from './performanceAttempts';
import './DashboardOverview.css';
import './Performance.css';

const formatScore = (attempt) => {
  if (!attempt || attempt.score === null || attempt.score === undefined || attempt.score === '' || !Number.isFinite(Number(attempt.score))) return 'Score unavailable';
  if (Number.isFinite(Number(attempt.maxScore)) && Number(attempt.maxScore) > 0) {
    return `${attempt.score} / ${attempt.maxScore}`;
  }
  return `${Number(attempt.score).toFixed(1)} / 10`;
};

const formatDate = (value) => {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Completion date unavailable';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const deltaLabel = (comparison) => {
  if (!comparison) return 'No previous comparable attempt';
  const delta = comparison.deltaPercentagePoints;
  if (Math.abs(delta) < 0.005) return 'No change';
  const rawDelta = comparison.deltaScore;
  const rawLabel = Number.isFinite(rawDelta)
    ? `${rawDelta > 0 ? '+' : ''}${rawDelta.toFixed(1)} score points · `
    : '';
  return `${rawLabel}${delta > 0 ? '+' : ''}${delta.toFixed(1)} percentage points`;
};

const deltaTone = (comparison) => {
  if (!comparison || Math.abs(comparison.deltaPercentagePoints) < 0.005) return 'neutral';
  return comparison.deltaPercentagePoints > 0 ? 'positive' : 'negative';
};

const AttemptHistory = ({ attempts, comparison, orderReliable }) => (
  <details className="performance-attempt-details">
    <summary>Attempt history <span>{attempts.length}</span></summary>
    <div className="performance-attempt-table-wrap">
      {!orderReliable && attempts.length > 1 && <p className="performance-no-identity">The service did not provide a timestamp or attempt sequence for every entry; chronological ordering and adjacent-attempt deltas are unavailable.</p>}
      <table className="performance-attempt-table">
        <thead><tr><th>Attempt</th><th>Completed</th><th>Score</th><th>Status</th><th>Change</th></tr></thead>
        <tbody>
          {attempts.map((attempt, index) => {
            const previous = index > 0 ? attempts[index - 1] : null;
            const change = previous && orderReliable
              ? { deltaPercentagePoints: attempt.percentage - previous.percentage }
              : null;
            const attemptLabel = attempt.attemptNumber ? `Attempt ${attempt.attemptNumber}` : 'Attempt';
            return (
              <tr key={attempt.id}>
                <td>{attemptLabel}</td>
                <td>{formatDate(attempt.completedAt)}</td>
                <td>{formatScore(attempt)}{Number.isFinite(Number(attempt.percentage)) ? ` · ${attempt.percentage.toFixed(1)}%` : ''}</td>
                <td>{attempt.status || 'Completed'}</td>
                <td className={`attempt-delta ${deltaTone(change)}`}>{!previous ? 'First attempt' : change ? deltaLabel(change) : 'Comparison unavailable'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {comparison && <p className="performance-comparison-scope">The comparison uses the immediately preceding attempt for this same assessment/topic.</p>}
    </div>
  </details>
);

const ComparisonVisual = ({ comparison, attemptCount, orderReliable, comparableIdentity }) => {
  if (!comparison) {
    const message = attemptCount < 2
      ? 'First attempt — no previous comparison available.'
      : !comparableIdentity
        ? 'Previous result belongs to a different or unidentified assessment; comparison unavailable.'
        : !orderReliable
          ? 'Multiple results exist, but their order cannot be verified.'
          : 'No previous comparable attempt is available.';
    return <div className="performance-first-attempt">{message}</div>;
  }

  return (
    <div className={`performance-comparison-visual ${deltaTone(comparison)}`}>
      <div className="comparison-score-row">
        <div><span>Previous</span><strong>{comparison.previous.percentage.toFixed(1)}%</strong></div>
        <div className="comparison-arrow" aria-hidden="true">→</div>
        <div><span>Current</span><strong>{comparison.latest.percentage.toFixed(1)}%</strong></div>
        <strong className={`comparison-delta ${deltaTone(comparison)}`}>
          {Math.abs(comparison.deltaPercentagePoints) < 0.005 ? 'No change' : comparison.deltaPercentagePoints > 0 ? 'Improved' : 'Declined'}
          <small>{deltaLabel(comparison)}</small>
        </strong>
      </div>
      <div className="comparison-bars" aria-label={`Previous ${comparison.previous.percentage.toFixed(1)} percent; current ${comparison.latest.percentage.toFixed(1)} percent`}>
        <div><span>Previous</span><i><b style={{ width: `${Math.min(100, Math.max(0, comparison.previous.percentage))}%` }} /></i></div>
        <div><span>Current</span><i><b style={{ width: `${Math.min(100, Math.max(0, comparison.latest.percentage))}%` }} /></i></div>
      </div>
    </div>
  );
};

const AttemptGroupCard = ({ group, typeLabel }) => {
  const attempts = group.attempts;
  const latest = group.historyOrderReliable ? attempts[attempts.length - 1] : null;
  const previous = group.historyOrderReliable && attempts.length > 1 ? attempts[attempts.length - 2] : null;
  const comparison = group.canCompare && group.historyOrderReliable ? compareLatestAttempts(attempts) : null;

  return (
    <article className="performance-attempt-group">
      <div className="performance-attempt-group-heading">
        <div><h3>{group.name || typeLabel}</h3><p>{typeLabel} · {attempts.length} completed attempt{attempts.length === 1 ? '' : 's'}</p></div>
        {latest?.attemptNumber != null && <span className="attempt-number-badge">Attempt {latest.attemptNumber}</span>}
      </div>
      {latest && (
        <div className="performance-latest-attempt">
          <div><span>Latest score</span><strong>{formatScore(latest)}</strong><small>{formatDate(latest.completedAt)}</small></div>
          {Number.isFinite(Number(latest.percentage)) && <DashboardProgressBar label="Latest attempt percentage" value={latest.percentage} tone={typeLabel === 'Coding' ? 'gold' : 'coral'} />}
        </div>
      )}
      <ComparisonVisual comparison={comparison} attemptCount={attempts.length} orderReliable={group.historyOrderReliable} comparableIdentity={group.canCompare} />
      {typeLabel === 'MCQ' && latest && (latest.correct != null || latest.incorrect != null) && (
        <p className="performance-question-counts">
          {latest.correct != null && `Correct ${latest.correct}`}
          {latest.incorrect != null && ` · Incorrect ${latest.incorrect}`}
          {latest.unanswered != null && ` · Unanswered ${latest.unanswered}`}
        </p>
      )}
      {typeLabel === 'Coding' && <p className="performance-question-counts">Coding section score only; test-case totals are not present in this result response.</p>}
      {typeLabel === 'Interview' && latest && (latest.technicalScore !== undefined || latest.communicationScore !== undefined) && (
        <div className="performance-interview-dimensions">
          {latest.technicalScore !== undefined && <span>Technical <strong>{latest.technicalScore}</strong></span>}
          {latest.communicationScore !== undefined && <span>Communication <strong>{latest.communicationScore}</strong></span>}
        </div>
      )}
      <AttemptHistory attempts={attempts} comparison={comparison} orderReliable={group.historyOrderReliable} />
      {!group.canCompare && <p className="performance-no-identity">The report did not include an assessment ID, so this result is not compared with other assessments.</p>}
      {group.canCompare && attempts.length > 1 && !comparison && <p className="performance-no-identity">A reliable timestamp or attempt sequence is missing, so previous/current comparison is unavailable.</p>}
      {previous && comparison && <span className="sr-only">Previous score {formatScore(previous)}. Current score {formatScore(latest)}.</span>}
    </article>
  );
};

const CategoryPanel = ({ id, title, description, icon: Icon, groups, error, loading, emptyMessage, typeLabel }) => {
  const attempts = groups.flatMap((group) => group.attempts);
  const datedAttempts = attempts
    .filter((attempt) => Number.isFinite(Date.parse(attempt.completedAt || '')))
    .sort((left, right) => Date.parse(left.completedAt) - Date.parse(right.completedAt));
  const latestDatedAttempt = datedAttempts[datedAttempts.length - 1];
  const comparableGroups = groups.filter((group) => group.canCompare);
  const comparisons = comparableGroups
    .filter((group) => group.historyOrderReliable)
    .map((group) => compareLatestAttempts(group.attempts))
    .filter(Boolean);
  const improved = comparisons.filter((comparison) => comparison.deltaPercentagePoints > 0.005).length;
  const declined = comparisons.filter((comparison) => comparison.deltaPercentagePoints < -0.005).length;
  const unchanged = comparisons.length - improved - declined;

  return (
    <section className="performance-category-card panel-surface" aria-labelledby={`${id}-heading`}>
      <div className="performance-category-title">
        <span className="performance-section-icon coral"><Icon size={19} /></span>
        <div><h2 id={`${id}-heading`}>{title}</h2><p>{description}</p></div>
      </div>
      <div className="performance-metric-pair">
        <div><span>Completed attempts</span><strong>{loading ? <LoaderCircle className="learning-inline-spinner" size={18} /> : attempts.length}</strong></div>
        <div><span>Latest dated result</span><strong>{loading ? 'Loading' : latestDatedAttempt ? formatScore(latestDatedAttempt) : attempts.length ? 'Order unavailable' : 'No result'}</strong></div>
      </div>
      {error && <p className="performance-empty" role="alert">Could not load {title.toLowerCase()} reports.</p>}
      {!loading && !error && groups.length === 0 && <p className="performance-empty">{emptyMessage}</p>}
      {!loading && !error && groups.length > 0 && (
        <>
          <p className="performance-trend-summary">
            Compared attempts: {comparisons.length ? `${improved} improved · ${declined} declined · ${unchanged} unchanged` : 'No previous comparable attempt'}
          </p>
          <div className="performance-attempt-groups">
            {groups.map((group) => <AttemptGroupCard key={group.id} group={group} typeLabel={typeLabel} />)}
          </div>
        </>
      )}
    </section>
  );
};

const Performance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sessions: interviews, isLoading: interviewsLoading, error: interviewsError } = useInterviewHistory(user);
  const [progressRevision, setProgressRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setProgressRevision((revision) => revision + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener('skillengine:progress-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('skillengine:progress-updated', refresh);
    };
  }, []);

  const progress = useMemo(() => readUserProgress(user), [user, progressRevision]);
  const mcqGroups = useMemo(
    () => groupAssessmentAttempts(assessmentCategoryAttempts(progress.assessments, 'mcq')),
    [progress.assessments],
  );
  const codingGroups = useMemo(
    () => groupAssessmentAttempts(assessmentCategoryAttempts(progress.assessments, 'coding')),
    [progress.assessments],
  );
  const practiceGroups = useMemo(() => {
    const categories = [...new Set(progress.practiceSessions.map((session) => String(session.category || '').trim()).filter(Boolean))];
    return categories.map((category) => ({
      id: `practice:${category.toLowerCase()}`,
      name: category,
      canCompare: true,
      historyOrderReliable: true,
      attempts: practiceCategoryAttempts(progress.practiceSessions, category),
    }));
  }, [progress.practiceSessions]);
  const interviewGroups = useMemo(
    () => interviewTopicAttempts(interviews).map((group) => ({
      id: `interview:${group.topic.toLowerCase()}`,
      name: group.topic,
      canCompare: true,
      historyOrderReliable: group.historyOrderReliable,
      attempts: group.attempts,
    })),
    [interviews],
  );

  const allAssessmentAttempts = [...mcqGroups, ...codingGroups].flatMap((group) => group.attempts);
  const allInterviewAttempts = interviewGroups.flatMap((group) => group.attempts);
  const distinctAttemptIds = new Set(
    [...allAssessmentAttempts, ...allInterviewAttempts].map((attempt) => {
      if (attempt.attemptId) return `${attempt.assessmentId || 'attempt'}:attempt:${attempt.attemptId}`;
      if (attempt.assessmentId && attempt.attemptNumber != null) return `${attempt.assessmentId}:number:${attempt.attemptNumber}`;
      if (attempt.assessmentId && attempt.completedAt) return `${attempt.assessmentId}:date:${attempt.completedAt}`;
      return attempt.id;
    }),
  );
  const assessmentReports = progress.assessments
    .filter((report) => report.result && !['cancelled', 'canceled', 'incomplete', 'in_progress', 'started', 'expired', 'invalid'].includes(String(report.status || '').toLowerCase()))
    .filter((report) => Number.isFinite(Date.parse(report.submittedAt || '')))
    .slice()
    .sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt));
  const latestAssessmentReport = assessmentReports[assessmentReports.length - 1];
  const overallChanges = [...mcqGroups, ...codingGroups, ...interviewGroups]
    .map((group) => compareLatestAttempts(group.attempts))
    .filter(Boolean);
  const overallImproved = overallChanges.filter((change) => change.deltaPercentagePoints > 0.005).length;
  const overallDeclined = overallChanges.filter((change) => change.deltaPercentagePoints < -0.005).length;
  const overallUnchanged = overallChanges.length - overallImproved - overallDeclined;

  return (
    <main className="dashboard-main performance-page">
      <header className="performance-page-heading">
        <div><span className="learning-eyebrow">Your assessment history</span><h1>Performance</h1><p>Compare completed reports by assessment identity or interview topic.</p></div>
        <button type="button" className="learning-secondary-action" onClick={() => navigate('/')}>
          Back to Dashboard <ArrowRight size={16} aria-hidden="true" />
        </button>
      </header>

      <section className="performance-overall panel-surface" aria-labelledby="overall-performance-heading">
        <div className="performance-overall-intro">
          <span className="performance-section-icon"><ChartNoAxesCombined size={19} /></span>
          <div><h2 id="overall-performance-heading">Overall performance</h2><p>Assessment categories remain separate when scoring scales or assessment identities differ.</p></div>
        </div>
        <div className="performance-overall-metrics">
          <div><span>Distinct completed attempts</span><strong>{distinctAttemptIds.size}</strong></div>
          <div><span>Latest scored assessment</span><strong>{latestAssessmentReport ? `${latestAssessmentReport.percentage.toFixed(1)}%` : 'No report'}</strong></div>
          <div><span>Comparison trend</span><strong>{overallChanges.length ? `${overallImproved} ↑ · ${overallDeclined} ↓ · ${overallUnchanged} =` : 'No comparison'}</strong></div>
        </div>
        {latestAssessmentReport && <DashboardProgressBar label={`${latestAssessmentReport.title || 'Latest assessment'} report score`} value={latestAssessmentReport.percentage} tone="coral" />}
        <p className="performance-data-note">Interview scores are shown on their own 10-point scale and are not combined with assessment percentages. An overall completion percentage is unavailable because assignment totals are not provided.</p>
      </section>

      <div className="performance-category-grid">
        <CategoryPanel
          id="mcq-performance"
          title="MCQ Performance"
          description="MCQ sections from authenticated assessment reports."
          icon={ClipboardCheck}
          groups={mcqGroups}
          typeLabel="MCQ"
          emptyMessage="No completed MCQ assessment report is available for this account."
        />
        <CategoryPanel
          id="coding-performance"
          title="Coding Performance"
          description="Coding sections from authenticated assessment reports."
          icon={ChartNoAxesCombined}
          groups={codingGroups}
          typeLabel="Coding"
          emptyMessage="No completed coding assessment report is available for this account. Coding test-case details are not included in the current results response."
        />
        <CategoryPanel
          id="interview-performance"
          title="Interview Performance"
          description="Interview reports compared only within the same topic."
          icon={Mic2}
          groups={interviewGroups}
          typeLabel="Interview"
          loading={interviewsLoading}
          error={interviewsError}
          emptyMessage="No completed interview reports were returned for this account."
        />
      </div>

      <section className="performance-quiz-note panel-surface">
        <span className="performance-section-icon green"><BookOpenCheck size={19} /></span>
        <div><h2>Practice quiz history</h2><p>Completed practice sessions are grouped by their recorded category. They are stored on this device because the current practice flow has no server-side attempt-history endpoint.</p></div>
        <button type="button" className="performance-category-action" onClick={() => navigate('/practice')}>Open Practice <ArrowRight size={15} /></button>
      </section>
    </main>
  );
};

export default Performance;
