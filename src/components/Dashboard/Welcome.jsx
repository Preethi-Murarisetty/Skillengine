import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import {
  FaChartBar,
  FaChartLine,
  FaFileAlt,
  FaLightbulb,
  FaMicrophone,
  FaPlay,
  FaRegClock,
  FaRobot,
  FaStar,
  FaTrophy,
  FaUpload,
} from 'react-icons/fa';

const Welcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    api.get('/interviews')
      .then((response) => {
        if (response.data.success) setHistory(response.data.sessions || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const scores = history.map((session) => Number(session.overall_score) || 0);
    const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const latest = scores[0] || 0;
    const best = scores.length ? Math.max(...scores) : 0;
    const answered = history.reduce((sum, session) => sum + (session.answered_questions || 0), 0);
    const questions = history.reduce((sum, session) => sum + (session.total_questions || 0), 0);
    const answerRate = questions ? (answered / questions) * 100 : 0;
    const recommendedRate = history.length ? (history.filter((session) => session.recommended).length / history.length) * 100 : 0;
    return { average, latest, best, answerRate, recommendedRate };
  }, [history]);

  const performanceBars = [
    { label: 'Interview Score', value: metrics.latest * 10 },
    { label: 'Answer Completion', value: metrics.answerRate },
    { label: 'Recommended Rate', value: metrics.recommendedRate },
    { label: 'Best Score', value: metrics.best * 10 },
  ];

  return (
    <main className="dashboard-main">
          <section className="dashboard-welcome-banner"><div><span className="dashboard-overline">AI interview workspace</span><h1>Welcome back, {user?.fullName || 'there'}!</h1><p>Ready for your next AI interview?</p><button type="button" className="dashboard-orange-button" onClick={() => navigate('/resume')}>Start New Interview <FaPlay /></button></div><div className="dashboard-bot-illustration" aria-hidden="true"><FaRobot /><small>AI</small></div></section>

          <section className="dashboard-stat-grid" aria-label="Interview statistics">
            <StatCard icon={<FaChartLine />} label="Overall Score" value={`${metrics.latest.toFixed(1)}/10`} description="Your latest performance" />
            <StatCard icon={<FaMicrophone />} label="Interviews Taken" value={history.length} description="Keep going!" />
            <StatCard icon={<FaStar />} label="Average Score" value={`${metrics.average.toFixed(1)}/10`} description="Across all interviews" />
            <StatCard icon={<FaTrophy />} label="Best Score" value={`${metrics.best.toFixed(1)}/10`} description="Your personal best" />
          </section>

          <div className="dashboard-feature-grid">
            <section className="dashboard-card performance-card"><PanelTitle icon={<FaChartBar />} title="Performance Overview" action="View Details" /><div className="performance-chart">{performanceBars.map((bar) => <div className="performance-column" key={bar.label}><div className="performance-value"><span style={{ height: `${Math.min(Math.max(bar.value, 0), 100)}%` }} /></div><strong>{bar.label}</strong><small>{Math.round(bar.value)}%</small></div>)}</div></section>
            <section className="dashboard-card mock-interview-card"><div><span className="dashboard-card-icon"><FaMicrophone /></span><h2>AI Mock Interview</h2><p>Quiz with questions generated<br />from your resume.</p><button type="button" className="dashboard-orange-button" onClick={() => navigate('/resume')}>Start Interview <FaPlay /></button><button type="button" className="dashboard-light-button" onClick={() => navigate('/resume')}><FaUpload /> Upload New Resume</button></div><div className="mock-card-illustration"><FaFileAlt /><FaMicrophone /></div></section>
          </div>

          <div className="dashboard-lower-grid">
            <section className="dashboard-card recent-card"><PanelTitle icon={<FaRegClock />} title="Recent Interviews" action="View All" /><div className="interview-table"><div className="interview-table-head"><span>Interview</span><span>Role</span><span>Date</span><span>Score</span><span>Status</span><span /></div>{isLoading ? <div className="dashboard-empty">Loading interview history...</div> : history.length ? history.slice(0, 4).map((session, index) => <div className="interview-table-row" key={`${session.session_id || 'session'}-${index}`}><span>{session.session_id || `Interview ${history.length - index}`}</span><span>Technical</span><span>{session.interview_date ? new Date(session.interview_date).toLocaleDateString() : 'N/A'}</span><span className="table-score">{(session.overall_score || 0).toFixed(1)}/10</span><span className="table-status">{session.recommended ? 'Completed' : 'Needs review'}</span><button type="button" onClick={() => navigate('/report')}>View Report <FaPlay /></button></div>) : <div className="dashboard-empty">No interviews yet. Start your first one!</div>}</div></section>
            <section className="dashboard-card recommendations-card"><PanelTitle icon={<FaLightbulb />} title="AI Recommendations" action="" /><Recommendation icon={<FaChartBar />} text="Improve technical skills" detail="Take more quizzes related to your role." /><Recommendation icon={<FaMicrophone />} text="Improve communication" detail="Explain your projects clearly and confidently." /><Recommendation icon={<FaStar />} text="Build interview confidence" detail="Keep taking quizzes to improve your performance." /></section>
          </div>
    </main>
  );
};

const StatCard = ({ icon, label, value, description }) => <div className="dashboard-stat-card"><span className="dashboard-stat-icon">{icon}</span><div><span className="dashboard-stat-label">{label}</span><strong>{value}</strong><small>{description}</small></div></div>;
const PanelTitle = ({ icon, title, action }) => <div className="dashboard-panel-title"><h2><span>{icon}</span>{title}</h2>{action && <button type="button">{action} <FaPlay /></button>}</div>;
const Recommendation = ({ icon, text, detail }) => <div className="recommendation-row"><span>{icon}</span><div><strong>{text}</strong><p>{detail}</p></div><FaPlay /></div>;

export default Welcome;
