import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, CheckCircle2, ClipboardCheck, LoaderCircle, PlayCircle, Sparkles, Target, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInterviewHistory } from '../../hooks/useInterviewHistory';
import ProgressBar from '../common/ProgressBar';
import { readUserProgress } from '../../utils/userProgress';
import { assignedAssessmentsForStudent, studentIdFromUser } from '../../services/localAssignedAssessments';
import './DashboardOverview.css';

const Welcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sessions: interviews, isLoading: interviewsLoading, error: interviewsError } = useInterviewHistory(user);
  const [progressRevision, setProgressRevision] = useState(0);
  const [assignmentRevision, setAssignmentRevision] = useState(0);
  const progress = useMemo(() => readUserProgress(user), [user, progressRevision]);
  const assignedAssessments = useMemo(() => assignedAssessmentsForStudent(user), [user, assignmentRevision]);
  const latestAssessment = progress.assessments[0] ?? null;
  const completedPractice = progress.practiceSessions.length;

  useEffect(() => {
    const refreshProgress = () => setProgressRevision((revision) => revision + 1);
    window.addEventListener('skillengine:progress-updated', refreshProgress);
    window.addEventListener('storage', refreshProgress);
    const refreshAssignments = () => setAssignmentRevision((revision) => revision + 1);
    window.addEventListener('skillengine:assigned-assessments-updated', refreshAssignments);
    window.addEventListener('storage', refreshAssignments);
    return () => {
      window.removeEventListener('skillengine:progress-updated', refreshProgress);
      window.removeEventListener('storage', refreshProgress);
      window.removeEventListener('skillengine:assigned-assessments-updated', refreshAssignments);
      window.removeEventListener('storage', refreshAssignments);
    };
  }, []);

  const displayName = user?.fullName || user?.full_name || user?.name || 'there';
  const latestInterview = interviews.find((session) => Number.isFinite(Number(session.overall_score)));
  const latestInterviewScore = latestInterview ? Number(latestInterview.overall_score) : null;
  const isRegistered = Boolean(user && (user.id || user.user_id || user.userId || user.email || user.fullName || user.full_name || user.name));
  const isSampleCompleted = (() => {
    try {
      const saved = localStorage.getItem('sampleTestCompleted');
      if (saved === 'true') return true;
      const report = localStorage.getItem('sampleInterviewReport');
      return Boolean(report && JSON.parse(report));
    } catch {
      return false;
    }
  })();
  const isCourseInProgress = (() => {
    const subscription = user?.courseSubscription || user?.course_subscription;
    const subscriptionStatus = String(subscription?.status || user?.courseSubscriptionStatus || '').toLowerCase();
    const progressStatus = String(subscription?.progressStatus || subscription?.progress_status || user?.courseProgressStatus || '').toLowerCase();
    return ['active', 'subscribed'].includes(subscriptionStatus)
      && ['in_progress', 'in progress', 'ongoing'].includes(progressStatus);
  })();

  const actionCards = [
    {
      title: 'Register',
      description: 'Complete or review your SkillEngine profile before continuing.',
      cta: isRegistered ? 'Profile ready' : 'Create account',
      route: isRegistered ? '/profile' : '/register',
      icon: <UserPlus size={22} />,
      tone: 'orange',
      completed: isRegistered,
    },
    {
      title: 'Sample Test',
      description: 'Upload your resume, prepare for a sample interview, and track your performance.',
      cta: isSampleCompleted ? 'Completed' : 'Start Sample Test',
      route: '/sample-test',
      icon: <ClipboardCheck size={22} />,
      tone: 'amber',
      completed: isSampleCompleted,
    },
    {
      title: 'Course',
      description: 'Explore learning tracks and course content to strengthen the right skills.',
      cta: 'Explore Courses',
      route: '/courses',
      icon: <BookOpenCheck size={22} />,
      tone: 'sage',
      completed: isCourseInProgress,
    },
  ];

  return (
    <main className="dashboard-main learning-dashboard">
      <section className="learning-welcome">
        <div>
          <span className="learning-eyebrow">Your learning workspace</span>
          <h1>Welcome back, {displayName}.</h1>
          <p>Practice interviews, take sample tests, and build confidence with guided learning courses designed for your next step.</p>
        </div>
        <span className="learning-welcome-mark" aria-hidden="true"><Sparkles size={24} /></span>
        <div className="learning-action-grid" aria-label="Dashboard actions">
          {actionCards.map((card) => (
            <button key={card.title} type="button" className={`learning-action-card ${card.tone}${card.completed ? ' is-complete' : ''}`} onClick={() => navigate(card.route)}>
              <span className="learning-action-icon">{card.icon}</span>
              <div className="learning-action-copy">
                <h2>{card.title}</h2>
                <p>{card.description}</p>
              </div>
              <span className="learning-action-link">
                {card.cta}
                {card.completed ? <CheckCircle2 size={15} aria-label="Completed" /> : <ArrowRight size={15} aria-hidden="true" />}
              </span>
            </button>
          ))}
        </div>
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

      {assignedAssessments.length > 0 && (
        <section className="learning-panel mt-4" aria-labelledby="assigned-assessments-title">
          <div className="learning-panel-header">
            <h2 id="assigned-assessments-title">Assigned assessments</h2>
            <span className="text-xs text-gray-500">{assignedAssessments.length}</span>
          </div>
          <ul className="learning-activity-list">
            {assignedAssessments.map((assessment) => {
              const token = assessment.token || assessment.link?.match(/\/(?:exam|assessment)\/([^/?#]+)/i)?.[1];
              const startsAt = assessment.details?.starts_at;
              const endsAt = assessment.details?.ends_at;
              const now = Date.now();
              const withinSchedule = !startsAt || !endsAt || (now >= new Date(startsAt).getTime() && now <= new Date(endsAt).getTime());
              return (
                <li key={assessment.id}>
                  <span className="learning-activity-bullet"><ClipboardCheck size={12} /></span>
                  <div>
                    <strong>{assessment.title}</strong>
                    <small>{[assessment.institution, assessment.course, assessment.year, assessment.department, assessment.section && `Section ${assessment.section}`].filter(Boolean).join(' · ')}</small>
                  </div>
                  {token && withinSchedule ? <button type="button" className="text-xs font-semibold text-orange-700" onClick={() => navigate(`/exam/${encodeURIComponent(token)}`)}>Start</button> : <em>{withinSchedule ? 'Assigned' : 'Not available now'}</em>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

      <section className="learning-panels-grid">
        <article className="learning-panel">
          <div className="learning-panel-header">
            <h2>Recent interview activity</h2>
            <button type="button" onClick={() => navigate('/interviews')}>View all <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          {interviewsLoading ? (
            <div className="learning-empty-state"><LoaderCircle className="learning-inline-spinner" size={18} aria-label="Loading" /> Loading activity...</div>
          ) : interviewsError ? (
            <div className="learning-empty-state">Interview history is not available right now.</div>
          ) : latestInterview ? (
            <ul className="learning-activity-list">
              {interviews.slice(0, 3).map((session) => (
                <li key={session.session_id || `${session.interview_type}-${session.interview_date}`}>
                  <span className="learning-activity-bullet"><PlayCircle size={12} /></span>
                  <div>
                    <strong>{session.interview_type || 'Technical interview'}</strong>
                    <small>{session.interview_date ? new Date(session.interview_date).toLocaleDateString() : 'Recent session'}</small>
                  </div>
                  <em>{Number(session.overall_score || 0).toFixed(1)}/10</em>
                </li>
              ))}
            </ul>
          ) : (
            <div className="learning-empty-state">No interview activity yet. Upload your resume to start your first interview.</div>
          )}
        </article>

        <article className="learning-panel">
          <div className="learning-panel-header">
            <h2>Skill momentum</h2>
            <button type="button" onClick={() => navigate('/performance')}>View performance <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          <div className="learning-focus-card">
            <div className="learning-focus-row">
              <span className="learning-focus-icon"><Target size={16} /></span>
              <div>
                <strong>{latestAssessment ? 'Current target' : 'Next step'}</strong>
                <p>{latestAssessment ? `Assessment score ${Math.round(latestAssessment.percentage)}%` : 'Complete your first assessment to unlock insights.'}</p>
              </div>
            </div>
            {latestAssessment && <ProgressBar progress={latestAssessment.percentage} label="Skill momentum" showPercentage />}
            <div className="learning-mini-stats">
              <div>
                <span>Practice</span>
                <strong>{completedPractice}</strong>
              </div>
              <div>
                <span>Interviews</span>
                <strong>{interviewsLoading ? '…' : interviewsError ? 'N/A' : interviews.length}</strong>
              </div>
              <div>
                <span>Latest</span>
                <strong>{latestInterviewScore === null ? '—' : `${latestInterviewScore.toFixed(1)}/10`}</strong>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
};

export default Welcome;
