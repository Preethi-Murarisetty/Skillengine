import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCalendarAlt, FaCheckCircle, FaClock, FaCode, FaRocket } from 'react-icons/fa';

const assignment = {
  title: 'React Frontend Logic Challenge',
  type: 'Frontend Development',
  dueDate: '12 Sep 2026',
  duration: '30 minutes',
  priority: 'High',
  description:
    'Build a responsive dashboard UI with reusable components, clean state handling, and an interactive assignment flow.',
  tasks: [
    'Create a dashboard layout with sidebar and top navigation.',
    'Implement reusable cards and status sections for assignment overview.',
    'Handle UI interactions for filtering and navigation states.',
    'Ensure the design is mobile responsive and visually consistent.',
  ],
};

const codingQuestions = [
  {
    id: 'q1',
    title: 'Find the highest value',
    language: 'JavaScript',
    prompt:
      'Write a function that accepts an array of numbers and returns the maximum number in the array. Handle empty input safely.',
    starter: `function findMaxValue(numbers) {
  if (!numbers || numbers.length === 0) {
    return null;
  }

  // write your logic here

}`,
  },
  {
    id: 'q2',
    title: 'Check if a string is a palindrome',
    language: 'JavaScript',
    prompt:
      'Create a function that returns true if the provided string is a palindrome, ignoring spaces and case.',
    starter: `function isPalindrome(input) {
  const normalized = input.toLowerCase().replace(/\s+/g, '');

  // write your logic here

}`,
  },
  {
    id: 'q3',
    title: 'Filter even numbers',
    language: 'JavaScript',
    prompt:
      'Write a function that returns only the even numbers from a list and keeps the original order.',
    starter: `function filterEvenNumbers(numbers) {
  // write your logic here

}`,
  },
];

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const UpcomingAssignment = () => {
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [answers, setAnswers] = useState(() => Object.fromEntries(codingQuestions.map((question) => [question.id, question.starter])));
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isStarted || isSubmitted) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          setIsSubmitted(true);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isSubmitted]);

  const currentQuestion = codingQuestions[currentIndex];

  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => value && value.trim().length > 0).length,
    [answers],
  );

  const handleCodeChange = (value) => {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: value,
    }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <main className="dashboard-main">
        <section className="dashboard-welcome-banner practice-result-banner">
          <div>
            <span className="dashboard-overline">ASSIGNMENT COMPLETED</span>
            <h1>Your coding task has been submitted</h1>
            <p>Your answers have been captured and your progress is saved.</p>
          </div>
          <FaCheckCircle className="practice-result-icon" />
        </section>

        <section className="dashboard-card" style={{ padding: '24px' }}>
          <div className="practice-result-grid">
            <div className="dashboard-card practice-result-score">
              <span className="dashboard-stat-label">Questions Answered</span>
              <strong>{answeredCount}/{codingQuestions.length}</strong>
              <span>Submitted code blocks</span>
            </div>
            <div className="dashboard-card practice-result-score">
              <span className="dashboard-stat-label">Time Remaining</span>
              <strong>{formatTime(timeLeft)}</strong>
              <span>Time tracked for the session</span>
            </div>
            <div className="dashboard-card practice-result-score">
              <span className="dashboard-stat-label">Status</span>
              <strong>Saved</strong>
              <span>Your work has been recorded</span>
            </div>
          </div>

          <div className="practice-result-actions">
            <button type="button" className="dashboard-light-button" onClick={() => navigate('/dashboard')}>
              <FaArrowLeft /> Back to Dashboard
            </button>
            <button type="button" className="dashboard-orange-button" onClick={() => setIsStarted(false)}>
              Review Assignment
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (isStarted) {
    return (
      <main className="dashboard-main">
        <section className="coding-assignment-shell">
          <div className="coding-header">
            <div>
              <span className="dashboard-overline">CODING ASSIGNMENT</span>
              <h1>{assignment.title}</h1>
            </div>
            <div className="coding-timer">
              <FaClock />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="coding-layout">
            <aside className="coding-question-list">
              <div className="coding-list-header">Questions</div>
              {codingQuestions.map((question, index) => (
                <button
                  type="button"
                  key={question.id}
                  className={`coding-question-item ${currentIndex === index ? 'is-active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                >
                  <span>Q{index + 1}</span>
                  <div>
                    <strong>{question.title}</strong>
                    <small>{question.language}</small>
                  </div>
                </button>
              ))}
            </aside>

            <div className="coding-editor-panel">
              <div className="coding-question-meta">
                <span className="coding-badge">{currentQuestion.language}</span>
                <strong>Question {currentIndex + 1}</strong>
              </div>

              <h2>{currentQuestion.title}</h2>
              <p className="coding-question-prompt">{currentQuestion.prompt}</p>

              <div className="coding-editor-toolbar">
                <span>Code Editor</span>
                <span>{answeredCount}/{codingQuestions.length} answered</span>
              </div>

              <textarea
                className="coding-editor"
                value={answers[currentQuestion.id] || ''}
                onChange={(event) => handleCodeChange(event.target.value)}
                spellCheck={false}
              />

              <div className="coding-actions">
                <button
                  type="button"
                  className="dashboard-light-button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                >
                  Previous
                </button>

                <button
                  type="button"
                  className="dashboard-light-button"
                  onClick={() => setCurrentIndex((index) => Math.min(codingQuestions.length - 1, index + 1))}
                >
                  Next
                </button>

                <button type="button" className="dashboard-orange-button" onClick={handleSubmit}>
                  Submit Assignment
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      <section className="practice-hero">
        <div>
          <span>UPCOMING ASSIGNMENT</span>
          <h1>Coding Assignment Allocated</h1>
          <p>Your next coding sprint has been assigned. Review the details and prepare to begin.</p>
          <button type="button" className="practice-hero-button" onClick={() => navigate('/dashboard')}>
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>
      </section>

      <section className="dashboard-card" style={{ padding: '24px' }}>
        <div className="dashboard-panel-title" style={{ marginBottom: '18px' }}>
          <h2>
            <span><FaCode /></span>
            {assignment.title}
          </h2>
          <span className="table-status" style={{ background: '#fff0e5', color: '#a94727' }}>
            {assignment.priority} Priority
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="dashboard-stat-card" style={{ minHeight: '110px' }}>
            <span className="dashboard-stat-icon"><FaCalendarAlt /></span>
            <div>
              <span className="dashboard-stat-label">Due Date</span>
              <strong>{assignment.dueDate}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card" style={{ minHeight: '110px' }}>
            <span className="dashboard-stat-icon"><FaClock /></span>
            <div>
              <span className="dashboard-stat-label">Duration</span>
              <strong>{assignment.duration}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card" style={{ minHeight: '110px' }}>
            <span className="dashboard-stat-icon"><FaRocket /></span>
            <div>
              <span className="dashboard-stat-label">Track</span>
              <strong>{assignment.type}</strong>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <h3 className="font-semibold text-lg mb-3">Assignment Brief</h3>
          <p className="text-gray-700 mb-4">{assignment.description}</p>

          <ul className="space-y-2 text-gray-700">
            {assignment.tasks.map((task, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 text-orange-500">✓</span>
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-end">
          <button type="button" className="btn-secondary min-w-[170px]">
            View Details
          </button>
          <button type="button" className="btn-primary min-w-[170px]" onClick={() => setIsStarted(true)}>
            Start Assignment
          </button>
        </div>
      </section>
    </main>
  );
};

export default UpcomingAssignment;
