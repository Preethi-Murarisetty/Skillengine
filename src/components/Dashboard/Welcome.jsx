import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, ClipboardCheck, LoaderCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInterviewHistory } from '../../hooks/useInterviewHistory';
import ProgressBar from '../common/ProgressBar';
import { readUserProgress } from '../../utils/userProgress';
import './DashboardOverview.css';

const Welcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sessions: interviews, isLoading: interviewsLoading, error: interviewsError } = useInterviewHistory(user);
  const [progressRevision, setProgressRevision] = useState(0);
  const progress = useMemo(() => readUserProgress(user), [user, progressRevision]);
  const latestAssessment = progress.assessments[0] ?? null;
  const completedPractice = progress.practiceSessions.length;

  useEffect(() => {
    const refreshProgress = () => setProgressRevision((revision) => revision + 1);
    window.addEventListener('skillengine:progress-updated', refreshProgress);
    window.addEventListener('storage', refreshProgress);
    return () => {
      window.removeEventListener('skillengine:progress-updated', refreshProgress);
      window.removeEventListener('storage', refreshProgress);
    };
  }, []);

  const displayName = user?.fullName || user?.full_name || user?.name || 'there';
  const latestInterview = interviews.find((session) => Number.isFinite(Number(session.overall_score)));
  const latestInterviewScore = latestInterview ? Number(latestInterview.overall_score) : null;

  return (
    <main className="dashboard-main learning-dashboard">
      <section className="learning-welcome">
        <div>
          <span className="learning-eyebrow">Your learning workspace</span>
          <h1>Welcome back, {displayName}.</h1>
          <p>Small, focused steps make strong preparation. Choose what you want to work on today.</p>
        </div>
        <span className="learning-welcome-mark" aria-hidden="true"><Sparkles size={24} /></span>
      </section>

      <section className={`learning-assessment-panel${latestAssessment ? ' is-complete' : ''}`} aria-labelledby="assessment-status-title">
        <div className="learning-assessment-copy">
          <span className="learning-eyebrow">Assessment</span>
          <h2 id="assessment-status-title">{latestAssessment ? 'Assessment completed' : 'Your learning journey starts here.'}</h2>
          <p>
            {latestAssessment
              ? 'Your latest result is ready. Review your score and keep building your skills with focused practice.'
              : 'Take your first assessment to evaluate your current skills and track your progress. Open the assessment link provided by your instructor to read its instructions and begin.'}
          </p>
          {latestAssessment ? (
            <div className="learning-latest-score">
              <span>Latest score</span>
              <strong>{Math.round(latestAssessment.percentage)}%</strong>
            </div>
          ) : (
            <div className="learning-assessment-status">
              <span className="learning-status-dot" /> No completed assessment is linked to this account yet
            </div>
          )}
        </div>
        <div className="learning-assessment-actions">
          {latestAssessment && (
            <div className="learning-assessment-progress">
              <ProgressBar progress={latestAssessment.percentage} label="Latest assessment score" showPercentage />
            </div>
          )}
          <button type="button" className="learning-primary-action" onClick={() => navigate('/assessments')}>
            {latestAssessment ? 'Retake Assessment' : 'Start Assessment'} <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button type="button" className="learning-secondary-action" onClick={() => navigate('/performance')}>
            View Performance <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="learning-summary-grid" aria-label="Learning summary">
        <article className="learning-summary-card">
          <span className="learning-summary-icon assessment"><ClipboardCheck size={19} /></span>
          <div><span>Assessments</span><strong>{latestAssessment ? `${progress.assessments.length} completed` : 'Not started'}</strong></div>
          <small>{latestAssessment ? latestAssessment.title : 'Open an invite link to begin'}</small>
        </article>
        <article className="learning-summary-card">
          <span className="learning-summary-icon practice"><BookOpenCheck size={19} /></span>
          <div><span>Practice sessions</span><strong>{completedPractice}</strong></div>
          <small>{completedPractice ? 'Completed on this account' : 'Your completed quiz sessions will appear here'}</small>
        </article>
        <article className="learning-summary-card">
          <span className="learning-summary-icon interview"><Sparkles size={19} /></span>
          <div><span>AI interviews</span><strong>{interviewsLoading ? <LoaderCircle className="learning-inline-spinner" size={18} aria-label="Loading" /> : interviewsError ? 'Unavailable' : interviews.length}</strong></div>
          <small>{interviewsError ? 'Could not load interview history' : latestInterviewScore === null ? 'Completed interview sessions' : `Latest score ${latestInterviewScore.toFixed(1)} / 10`}</small>
        </article>
      </section>

      <section className="learning-practice-panel">
        <div className="learning-practice-icon"><BookOpenCheck size={20} /></div>
        <div className="learning-practice-copy">
          <h2>Practice at your own pace</h2>
          <p>Choose an untimed quiz category, work through questions, and review your score when you finish.</p>
        </div>
        <button type="button" className="learning-secondary-action" onClick={() => navigate('/practice')}>
          Start Practising <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>
    </main>
  );
};

export default Welcome;
