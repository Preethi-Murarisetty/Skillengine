import React, { useRef, useState } from 'react';
import { FaArrowLeft, FaBookOpen, FaBrain, FaCalculator, FaCheckCircle, FaPlay, FaPuzzlePiece, FaRedo } from 'react-icons/fa';
import ProgressBar from '../common/ProgressBar';
import QuestionCard from '../Phase1/QuestionCard';
import Timer from '../Phase1/Timer';
import { aptitudeQuestions, communicationQuestions, phase1Config, reasoningQuestions, selectQuestions } from '../../data/phase1Questions';

const practiceOptions = [
  { key: 'aptitude', title: 'Aptitude', description: 'Practice quantitative aptitude questions and improve your problem-solving speed.', icon: <FaCalculator />, questions: aptitudeQuestions, iconClass: 'aptitude-icon' },
  { key: 'reasoning', title: 'Reasoning', description: 'Practice logical reasoning and improve your analytical thinking.', icon: <FaPuzzlePiece />, questions: reasoningQuestions, iconClass: 'reasoning-icon' },
  { key: 'verbal', title: 'Verbal', description: 'Improve verbal ability, grammar, vocabulary and comprehension skills.', icon: <FaBookOpen />, questions: communicationQuestions, iconClass: 'verbal-icon' },
];

const difficultyLevels = ['Easy', 'Medium', 'Hard'];

const Practice = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
  const [activeCategory, setActiveCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sessionResult, setSessionResult] = useState(null);
  const submittedRef = useRef(false);

  const startSession = (category) => {
    setActiveCategory(category);
    setQuestions(selectQuestions(category.questions, 10));
    setAnswers({});
    setCurrentIndex(0);
    setSessionResult(null);
    submittedRef.current = false;
  };

  const finishSession = () => {
    if (submittedRef.current || !activeCategory) return;
    submittedRef.current = true;
    const answered = questions.filter((question) => answers[question.id] !== undefined).length;
    const score = questions.reduce((total, question) => {
      const answer = answers[question.id];
      if (answer === undefined) return total;
      return total + (question.section === 'communication' ? answer.score : answer === question.correctAnswer ? 1 : 0);
    }, 0);
    const maxScore = activeCategory.key === 'verbal' ? questions.length * 4 : questions.length;
    setSessionResult({ score, maxScore, answered, percentage: maxScore ? (score / maxScore) * 100 : 0 });
  };

  const handleAnswer = (answer) => {
    if (submittedRef.current) return;
    setAnswers((current) => ({ ...current, [questions[currentIndex].id]: answer }));
  };

  if (sessionResult) {
    return (
      <main className="dashboard-main practice-main">
        <div className="practice-session-header"><button type="button" className="practice-back-button" onClick={() => { setActiveCategory(null); setSessionResult(null); }}><FaArrowLeft /> Back to Quiz Categories</button><span className="dashboard-overline">Session complete</span></div>
        <section className="dashboard-welcome-banner practice-result-banner"><div><span className="dashboard-overline">{activeCategory.title} Quiz</span><h1>Quiz Results</h1><p>Your progress has been saved for this session.</p></div><FaCheckCircle className="practice-result-icon" /></section>
        <section className="practice-result-grid">
          <div className="dashboard-card practice-result-score"><span className="dashboard-stat-label">Score</span><strong>{sessionResult.score}/{sessionResult.maxScore}</strong><ProgressBar progress={sessionResult.percentage} /><span>{Math.round(sessionResult.percentage)}% overall</span></div>
          <div className="dashboard-card practice-result-score"><span className="dashboard-stat-label">Answered</span><strong>{sessionResult.answered}/{questions.length}</strong><span>Questions attempted</span></div>
          <div className="dashboard-card practice-result-score"><span className="dashboard-stat-label">Difficulty</span><strong>{selectedDifficulty}</strong><span>{phase1Config.PHASE1_DURATION / 60} minute time limit</span></div>
        </section>
        <div className="practice-result-actions"><button type="button" className="dashboard-light-button" onClick={() => startSession(activeCategory)}><FaRedo /> Try Again</button><button type="button" className="dashboard-orange-button" onClick={() => { setActiveCategory(null); setSessionResult(null); }}>Choose Another Quiz <FaPlay /></button></div>
      </main>
    );
  }

  if (activeCategory) {
    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const isLastQuestion = currentIndex === questions.length - 1;
    return (
      <main className="dashboard-main practice-main">
        <div className="practice-session-header"><button type="button" className="practice-back-button" onClick={() => setActiveCategory(null)}><FaArrowLeft /> Exit Quiz</button><div><span className="dashboard-overline">{activeCategory.title} Quiz · {selectedDifficulty}</span><h1>Question {currentIndex + 1} of {questions.length}</h1></div><Timer durationSeconds={phase1Config.PHASE1_DURATION} onExpire={finishSession} /></div>
        <div className="practice-timer-note">The quiz will submit automatically when the timer reaches 00:00.</div>
        <div className="practice-progress-card"><div><span>Progress</span><strong>{Math.round(progress)}%</strong></div><ProgressBar progress={progress} /></div>
        <QuestionCard question={currentQuestion} selectedAnswer={answers[currentQuestion.id]} onSelect={handleAnswer} />
        <div className="practice-question-actions"><button type="button" className="dashboard-light-button" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}>Previous</button><button type="button" className="dashboard-orange-button" onClick={() => isLastQuestion ? finishSession() : setCurrentIndex((index) => index + 1)}>{isLastQuestion ? 'Submit Quiz' : 'Next Question'} <FaPlay /></button></div>
      </main>
    );
  }

  return (
    <main className="dashboard-main practice-main">
        <section className="practice-hero">
          <div><span>QUIZ MAKES PROGRESS</span><h1>Sharpen Your Skills, Build Confidence!</h1><p>Take quiz sessions, improve your answers and get ready for real interviews.</p><button type="button" className="practice-hero-button" onClick={() => startSession(practiceOptions[0])}>Start Quiz <FaPlay /></button></div>
        </section>
        <div className="practice-section-heading">
          <div><span className="practice-section-icon"><FaBrain /></span><div><h2>Quiz Sessions</h2><p>Choose a category, set your difficulty and start learning.</p></div></div>
        </div>
        <section className="practice-grid practice-category-grid" aria-label="Quiz categories">
          {practiceOptions.map((option) => <article className="dashboard-card practice-card" key={option.key}>
            <span className={`practice-icon ${option.iconClass}`}>{option.icon}</span>
            <h2>{option.title}</h2>
            <p>{option.description}</p>
            <div className="practice-choice-group"><strong>Difficulty</strong><div className="practice-choice-row">{difficultyLevels.map((level) => <button type="button" className={selectedDifficulty === level ? 'is-selected' : ''} key={level} onClick={() => setSelectedDifficulty(level)}>{level}</button>)}</div></div>
            <div className="practice-choice-group"><strong><span aria-hidden="true">⏱</span> Time Limit</strong><span className="practice-fixed-time">{phase1Config.PHASE1_DURATION / 60} minutes</span></div>
            <button type="button" className="dashboard-orange-button" onClick={() => startSession(option)}><span>Start {option.title} Quiz</span><FaPlay /></button>
          </article>)}
        </section>
    </main>
  );
};

export default Practice;
