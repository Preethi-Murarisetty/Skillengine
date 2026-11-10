import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartLine, FaMicrophone, FaPlay, FaStar, FaTrophy } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { useInterviewHistory } from '../../hooks/useInterviewHistory';
import { mergeInterviewSessions } from '../../services/interviewHistory';
import { readUserProgress } from '../../utils/userProgress';
import ResumeUpload from './ResumeUpload';

const hasStoredResumeData = () => {
  try {
    return Boolean(sessionStorage.getItem('resumeData'));
  } catch {
    return false;
  }
};

const Interviews = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessions: serverHistory, isLoading } = useInterviewHistory(user);
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

  const localHistory = useMemo(() => readUserProgress(user).interviewSessions, [user, progressRevision]);
  const history = useMemo(
    () => mergeInterviewSessions(serverHistory, localHistory),
    [serverHistory, localHistory],
  );

  const metrics = useMemo(() => {
    const scores = history
      .map((session) => Number(session.overall_score ?? session.overallScore ?? session.score))
      .filter(Number.isFinite);
    return {
      taken: history.length,
      average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
      best: scores.length ? Math.max(...scores) : 0,
      latest: scores[0] || 0,
    };
  }, [history]);

  const statCards = [
    { label: 'Interviews Taken', value: metrics.taken, description: 'Keep going!', icon: <FaMicrophone /> },
    { label: 'Average Score', value: `${metrics.average.toFixed(1)}/10`, description: 'Across all interviews', icon: <FaChartLine /> },
    { label: 'Best Score', value: `${metrics.best.toFixed(1)}/10`, description: 'Your personal best', icon: <FaTrophy /> },
    { label: 'Latest Score', value: `${metrics.latest.toFixed(1)}/10`, description: 'Most recent result', icon: <FaStar /> },
  ];

  if (!hasStoredResumeData()) {
    return <ResumeUpload />;
  }

  return (
    <main className="dashboard-main interviews-main">
        <div className="practice-heading">
          <span className="dashboard-overline">Your progress</span>
          <h1>Interviews</h1>
          <p>Review your AI interview sessions and track your performance.</p>
          <button type="button" className="dashboard-orange-button" onClick={() => navigate('/resume')}><span>Start Interview</span><FaPlay /></button>
        </div>
        <section className="dashboard-stat-grid interviews-stat-grid" aria-label="Interview statistics">
          {statCards.map((stat) => <div className="dashboard-stat-card" key={stat.label}><span className="dashboard-stat-icon">{stat.icon}</span><div><span className="dashboard-stat-label">{stat.label}</span><strong>{stat.value}</strong><small>{stat.description}</small></div></div>)}
        </section>
        <section className="dashboard-card interviews-recent-card">
          <div className="dashboard-panel-title"><h2><span><FaMicrophone /></span>Recent Interviews</h2></div>
          <div className="interviews-list">
            {isLoading ? <div className="dashboard-empty">Loading interview history...</div> : history.length ? history.map((session, index) => {
              const score = Number(session.overall_score ?? session.overallScore ?? session.score) || 0;
              const completedAt = session.interview_date || session.completed_at || session.completedAt;
              const isCompleted = !['cancelled', 'canceled', 'incomplete', 'in_progress', 'started', 'expired'].includes(String(session.status || '').toLowerCase());
              return <div className="interview-item" key={`${session.session_id || session.id || 'session'}-${index}`}>
              <span className="interview-item-icon"><FaMicrophone /></span><div className="interview-item-info"><strong>{session.interview_type || session.topic || 'Technical Interview'}</strong><span>{completedAt ? new Date(completedAt).toLocaleDateString() : 'Date unavailable'} <i /> {session.difficulty || 'Intermediate'}</span></div><div className="interview-item-score"><strong>{score.toFixed(1)}/10</strong><span className={isCompleted ? 'interview-status' : 'interview-status needs-review'}>{isCompleted ? 'Completed' : 'Needs review'}</span></div><button type="button" className="dashboard-light-button" onClick={() => navigate('/report')}>View Report <FaPlay /></button>
            </div>;
            }) : <div className="dashboard-empty">No interviews yet. Start your first one!</div>}
          </div>
        </section>
    </main>
  );
};

export default Interviews;
