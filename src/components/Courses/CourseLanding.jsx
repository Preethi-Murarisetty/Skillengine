import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const learningTracks = [
  {
    title: 'Technical Foundations',
    description: 'Strengthen core skills in coding, problem solving, and system thinking with guided practice.',
    badge: 'Beginner',
    length: '4 weeks',
  },
  {
    title: 'Interview Readiness',
    description: 'Learn how to tell your story, answer behavioral prompts, and structure technical explanations clearly.',
    badge: 'Popular',
    length: '3 weeks',
  },
  {
    title: 'Career Skills',
    description: 'Build communication, leadership, and portfolio-ready habits that help you stand out in interviews.',
    badge: 'Career',
    length: '2 weeks',
  },
];

const courseChecklist = [
  'Structured practice paths aligned to current role expectations.',
  'Interview and assessment preparation built into each learning track.',
  'Hands-on sessions designed to complement mock interviews and sample tests.',
  'Progress updates that can be expanded with your existing learning data later.',
];

const CourseLanding = () => {
  const navigate = useNavigate();

  return (
    <main className="dashboard-main learning-dashboard">
      <section className="learning-welcome">
        <div>
          <span className="learning-eyebrow">Learning hub</span>
          <h1>Courses designed to keep you progressing.</h1>
          <p>Explore focused learning tracks, deepen your current skills, and stay ready for interviews and sample assessments.</p>
        </div>
        <span className="learning-welcome-mark" aria-hidden="true"><BookOpen size={24} /></span>
      </section>

      <section className="learning-summary-grid" aria-label="Course overview">
        <article className="learning-summary-card">
          <span className="learning-summary-icon practice"><BookOpen size={19} /></span>
          <div><span>Tracks</span><strong>{learningTracks.length}</strong></div>
          <small>Curated learning paths</small>
        </article>
        <article className="learning-summary-card">
          <span className="learning-summary-icon assessment"><Clock3 size={19} /></span>
          <div><span>Weekly focus</span><strong>Flexible</strong></div>
          <small>Designed for steady progress</small>
        </article>
        <article className="learning-summary-card">
          <span className="learning-summary-icon interview"><Sparkles size={19} /></span>
          <div><span>Outcome</span><strong>Ready</strong></div>
          <small>Interview and skill confidence</small>
        </article>
      </section>

      <section className="learning-panels-grid">
        <article className="learning-panel">
          <div className="learning-panel-header">
            <h2>Featured learning tracks</h2>
            <button type="button" onClick={() => navigate('/sample-test')}>Try a sample test <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          <div className="course-track-list">
            {learningTracks.map((track) => (
              <div className="course-track-card" key={track.title}>
                <div className="course-track-header">
                  <span className="course-track-badge">{track.badge}</span>
                  <span className="course-track-duration">{track.length}</span>
                </div>
                <h3>{track.title}</h3>
                <p>{track.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="learning-panel">
          <div className="learning-panel-header">
            <h2>Course checklist</h2>
          </div>
          <ul className="course-checklist">
            {courseChecklist.map((item) => (
              <li key={item}>
                <span><CheckCircle2 size={15} /></span>
                <p>{item}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
};

export default CourseLanding;
