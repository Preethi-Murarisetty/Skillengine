import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';

const formatPercent = (value) => `${value.toFixed(1)}%`;

const getPerformanceLevel = (percentage) => {
  if (percentage >= 80) return 'Excellent';
  if (percentage >= 60) return 'Good';
  if (percentage >= 40) return 'Average';
  return 'Needs Improvement';
};

const SectionSummary = ({ title, stats, communication = false }) => (
  <Card hover={false} className="border border-gray-100">
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{formatPercent(stats.percentage)}</span>
    </div>
    <p className="mt-4 text-3xl font-bold text-indigo-600">{stats.score} / {communication ? stats.maxScore : stats.total}</p>
    <ProgressBar progress={stats.percentage} />
    <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
      <span>Total: {stats.total}</span>
      {!communication && <><span>Attempted: {stats.attempted}</span><span>Correct: {stats.correct}</span><span>Wrong: {stats.wrong}</span><span>Skipped: {stats.skipped}</span></>}
      {communication && <span>Max score: {stats.maxScore}</span>}
    </div>
  </Card>
);

const Phase1Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [result] = useState(() => {
    if (location.state?.result) return location.state.result;
    const stored = sessionStorage.getItem('phase1Result');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (!result) navigate('/phase1', { replace: true });
  }, [navigate, result]);

  if (!result) return null;

  const performanceLevel = getPerformanceLevel(result.percentage);
  const categoryEntries = Object.entries(result.communication.categoryScores);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="gradient-hero rounded-3xl p-8 text-white md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Practice complete</p>
        <h1 className="mt-2 text-4xl font-bold">Phase 1 Results</h1>
        <p className="mt-3 text-white/90">Your results show where your current strengths can support the technical interview.</p>
      </div>

      <Card hover={false} className="!bg-gray-900 text-white">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-indigo-300">Overall Phase 1 Score</p><p className="mt-2 text-5xl font-bold">{result.score} <span className="text-2xl text-gray-400">/ {result.maxScore}</span></p></div>
          <div className="text-right"><p className="text-3xl font-bold text-indigo-300">{formatPercent(result.percentage)}</p><p className="mt-1 text-sm text-gray-300">{performanceLevel}</p></div>
        </div>
        <div className="mt-6"><ProgressBar progress={result.percentage} /></div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300"><span>Correct: {result.aptitude.correct + result.reasoning.correct}</span><span>Wrong: {result.aptitude.wrong + result.reasoning.wrong}</span><span>Skipped: {result.aptitude.skipped + result.reasoning.skipped}</span></div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <SectionSummary title="Aptitude" stats={result.aptitude} />
        <SectionSummary title="Reasoning" stats={result.reasoning} />
        <SectionSummary title="Communication Skills" stats={result.communication} communication />
      </div>

      <Card hover={false}>
        <h2 className="text-2xl font-bold text-gray-800">Communication Analysis</h2>
        <p className="mt-1 text-gray-500">Category-wise performance across your workplace scenarios.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {categoryEntries.map(([category, scores]) => {
            const percentage = scores.maxScore ? (scores.score / scores.maxScore) * 100 : 0;
            return <div key={category}><div className="mb-2 flex justify-between text-sm font-semibold text-gray-700"><span className="capitalize">{category.replaceAll('-', ' ')}</span><span>{formatPercent(percentage)}</span></div><ProgressBar progress={percentage} /></div>;
          })}
        </div>
      </Card>

      <Card hover={false}>
        <h2 className="text-2xl font-bold text-gray-800">Review Answers</h2>
        <div className="mt-5 space-y-4">
          {result.review.map((question, index) => {
            const communication = question.section === 'communication';
            const selectedText = communication ? question.selectedAnswer?.text : question.selectedAnswer;
            const selectedScore = communication ? question.selectedAnswer?.score : null;
            const isCorrect = communication ? selectedScore === 4 : selectedText === question.correctAnswer;
            return <div key={question.id} className="rounded-xl border border-gray-100 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><p className="font-semibold text-gray-800">{index + 1}. {question.question}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${question.skipped ? 'bg-amber-50 text-amber-700' : isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{question.skipped ? 'Skipped' : communication ? `Score: ${selectedScore}/4` : isCorrect ? 'Correct' : 'Wrong'}</span></div><p className="mt-2 text-sm text-gray-600">Selected: <strong>{selectedText || 'No answer'}</strong></p>{communication ? <p className="mt-1 text-sm text-gray-500">Best response score: 4/4</p> : <p className="mt-1 text-sm text-gray-500">Correct answer: {question.correctAnswer}</p>}</div>;
          })}
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-3 pb-4">
        <button type="button" onClick={() => navigate('/')} className="btn-secondary">Back to Dashboard</button>
        <button type="button" onClick={() => navigate('/resume')} className="btn-primary">Continue to Phase 2 <span aria-hidden="true">&#8594;</span></button>
      </div>
    </div>
  );
};

export default Phase1Result;