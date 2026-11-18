// src/components/Interview/InterviewReport.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../../hooks/useInterview';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const SKIPPED_RE = /^the candidate skipped|^\[skipped\]$|^no answer provided$/i;

const safeParse = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

/** Normalise ONE question item (new backend `history[]` entry) */
const normaliseHistoryItem = (h, i) => {
  const max = Number(h.max_score) || 10;
  const score10 = ((Number(h.score) || 0) / max) * 10;
  const answer = h.candidate_answer || '';
  return {
    questionNumber: h.question_number || i + 1,
    topic: h.topic || 'General',
    level: h.level || '',
    question: h.question || `Question ${i + 1}`,
    answer,
    skipped: !answer || SKIPPED_RE.test(answer.trim()),
    timeExpired: !!h.question_time_expired,
    score: round1(score10),
    feedback: h.feedback || '',
    missing: h.missing_concepts || [],
    extracted: h.extracted_concepts || [],
    strengths: [],
    improvements: [],
    subScores: null,
  };
};

/** Normalise the NEW backend end-interview response */
const normaliseBackendReport = (data) => {
  const history = Array.isArray(data.history) ? data.history : [];
  const items = history.map(normaliseHistoryItem);
  const fa = data.final_analysis || {};

  // The backend's max_score (150) / percentage (1.33) are based on a fixed
  // question count, so compute them from the questions actually asked.
  const totalPoints = history.reduce((s, h) => s + (Number(h.score) || 0), 0);
  const maxPoints = history.reduce((s, h) => s + (Number(h.max_score) || 10), 0);
  const overall10 = maxPoints ? (totalPoints / maxPoints) * 10 : 0;

  return {
    report: {
      candidateName: data.candidate_name || data.candidateName || 'Candidate',
      topic: data.topic,
      level: data.level,
      overallScore: round1(overall10),
      percentage: maxPoints ? round1((totalPoints / maxPoints) * 100) : 0,
      totalPoints,
      maxPoints,
      totalQuestions: items.length,
      answeredQuestions: items.filter((d) => !d.skipped).length,
      strengths: fa.strengths || [],
      improvementAreas: fa.areas_for_improvement || [],
      recommendedLearning: fa.recommended_learning_areas || [],
      technicalAnalysis: fa.technical_analysis || '',
      communicationAnalysis: fa.communication_analysis || '',
      problemSolvingAnalysis: fa.problem_solving_analysis || '',
      finalFeedback: fa.final_feedback || '',
      recommendedForNextRound: overall10 >= 6,
    },
    items,
  };
};

/** Normalise the LEGACY sessionStorage shape (your old component logic) */
const normaliseLegacyReport = (report) => {
  const questions = safeParse('interviewQuestions') || safeParse('askedQuestions') || [];
  const answers = safeParse('interviewAnswers') || [];
  const evaluations = safeParse('interviewEvaluations') || [];

  const toItem = (d, i) => {
    const ev = d.evaluation || {};
    const answer = d.answer || '';
    return {
      questionNumber: i + 1,
      topic: d.topic || d.category || 'General',
      level: '',
      question: d.question || `Question ${i + 1}`,
      answer,
      skipped: !answer || SKIPPED_RE.test(String(answer).trim()),
      timeExpired: false,
      score: Number(ev.score) || 0,
      feedback: ev.feedback || '',
      missing: [],
      extracted: [],
      strengths: ev.strengths || [],
      improvements: ev.improvements || [],
      subScores: {
        Technical: ev.technicalAccuracy ?? ev.technical_accuracy ?? 0,
        Communication: ev.communicationSkills ?? ev.communication_skills ?? 0,
        Confidence: ev.confidence ?? 0,
        Completeness: ev.completeness ?? 0,
        Relevance: ev.relevance ?? 0,
      },
    };
  };

  let details = report.questionDetails || [];
  const hasRealAnswers = details.some((d) => d.answer && !SKIPPED_RE.test(d.answer));

  if (!hasRealAnswers) {
    const maxLen = Math.max(questions.length, answers.length, evaluations.length);
    if (maxLen > 0) {
      details = Array.from({ length: maxLen }, (_, i) => {
        const q = questions[i] || {};
        const a = answers[i] || {};
        const ev = answers[i]?.evaluation || evaluations[i] || {};
        return {
          question: typeof q === 'string' ? q : q.question || q.text,
          topic: typeof q === 'object' ? q.category || q.topic : 'General',
          answer: typeof a === 'string' ? a : a.answer || '[Skipped]',
          evaluation: ev,
        };
      });
    }
  }

  const items = details.map(toItem);
  return {
    report: {
      candidateName: report.candidateName || report.candidate_name || 'Candidate',
      overallScore: Number(report.overallScore || report.overall_score) || 0,
      technicalScore: report.technicalScore,
      communicationScore: report.communicationScore,
      confidenceScore: report.confidenceScore,
      totalQuestions: report.totalQuestions || items.length,
      answeredQuestions: report.answeredQuestions ?? items.filter((d) => !d.skipped).length,
      strengths: report.strengths || [],
      improvementAreas: report.improvementAreas || [],
      recommendedLearning: [],
      recommendedForNextRound: !!report.recommendedForNextRound,
    },
    items,
  };
};

const getGrade = (score) => {
  if (score >= 9) return { grade: 'A+', label: '🏆 Outstanding', color: 'text-green-600' };
  if (score >= 8) return { grade: 'A', label: '🎉 Excellent', color: 'text-green-500' };
  if (score >= 7) return { grade: 'B', label: '👍 Good', color: 'text-blue-500' };
  if (score >= 6) return { grade: 'C', label: '📚 Average', color: 'text-yellow-500' };
  if (score >= 5) return { grade: 'D', label: '⚠️ Below Average', color: 'text-orange-500' };
  return { grade: 'F', label: '❌ Needs Improvement', color: 'text-red-500' };
};

const scoreColor = (s) => {
  if (s >= 7) return 'bg-green-100 text-green-700';
  if (s >= 5) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const InterviewReport = () => {
  const { resetInterview } = useInterview();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [questionDetails, setQuestionDetails] = useState([]);

  useEffect(() => {
    try {
      // The raw end-interview API response (or the old processed report)
      const raw = safeParse('interviewReport') || safeParse('interviewResult');
      if (!raw) return;

      // The API may wrap the payload: { data: {...} }
      const payload = raw.history || raw.final_analysis ? raw : raw.data || raw;

      const { report, items } =
        Array.isArray(payload.history) || payload.final_analysis
          ? normaliseBackendReport(payload)
          : normaliseLegacyReport(payload);

      setReportData(report);
      setQuestionDetails(items);
    } catch (e) {
      console.error('Error loading report:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNewInterview = () => {
    resetInterview();
    [
      'interviewReport', 'interviewResult', 'interviewQuestions', 'interviewAnswers',
      'interviewEvaluations', 'askedQuestions', 'interviewSessionId', 'resumeData',
      'selfIntro', 'techTermsFound', 'totalQuestions', 'questionSource',
    ].forEach((k) => sessionStorage.removeItem(k));
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading your report...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Report Available</h2>
        <p className="text-gray-600 mb-4">Complete an interview first to generate a report.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Start New Interview</button>
      </div>
    );
  }

  const candidateName = reportData.candidateName;
  const overall = reportData.overallScore;
  const gradeInfo = getGrade(overall);

  const downloadReport = () => {
    let text = `AI TECHNICAL INTERVIEW REPORT\n${'='.repeat(40)}\nCandidate: ${candidateName}\nDate: ${new Date().toLocaleString()}\nOverall Score: ${overall}/10  Grade: ${gradeInfo.grade} ${gradeInfo.label}\n\n`;
    questionDetails.forEach((d, i) => {
      text += `Q${i + 1}. [${d.topic}] Score: ${d.score}/10\nQuestion: ${d.question}\nAnswer: ${d.answer}\nFeedback: ${d.feedback || 'N/A'}\n`;
      if (d.missing.length) text += `Missing concepts: ${d.missing.join(', ')}\n`;
      if (d.strengths.length) text += `Strengths: ${d.strengths.join(', ')}\n`;
      if (d.improvements.length) text += `Improvements: ${d.improvements.join(', ')}\n`;
      text += '\n';
    });
    if (reportData.finalFeedback) text += `Final Feedback:\n${reportData.finalFeedback}\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview_report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreCards = [
    reportData.technicalScore != null && { label: 'Technical', value: reportData.technicalScore },
    reportData.communicationScore != null && { label: 'Communication', value: reportData.communicationScore },
    reportData.confidenceScore != null && { label: 'Confidence', value: reportData.confidenceScore },
    { label: 'Overall', value: overall, highlight: true },
  ].filter(Boolean);

  const analysisBlocks = [
    { title: '🛠️ Technical Analysis', text: reportData.technicalAnalysis },
    { title: '🗣️ Communication Analysis', text: reportData.communicationAnalysis },
    { title: '🧩 Problem Solving Analysis', text: reportData.problemSolvingAnalysis },
  ].filter((b) => b.text);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="gradient-hero rounded-3xl p-6 sm:p-8 text-center text-white mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">📊 Interview Report</h1>
        <p className="text-white/90 text-sm sm:text-base">Candidate: {candidateName}</p>
        {(reportData.topic || reportData.level) && (
          <p className="text-white/90 text-sm">
            {[reportData.topic, reportData.level].filter(Boolean).join(' • ')}
          </p>
        )}
        <p className="text-white/70 text-xs mt-1">
          {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Score cards */}
      <div className={`grid grid-cols-2 ${scoreCards.length > 2 ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-3 sm:gap-4 mb-8`}>
        {scoreCards.map((item, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-xl p-4 text-center shadow-md ${item.highlight ? 'bg-indigo-50 border-2 border-indigo-200' : ''}`}
          >
            <p className="text-xs sm:text-sm text-gray-500">{item.label}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${item.highlight ? 'text-indigo-700' : 'text-indigo-600'}`}>
              {Number(item.value).toFixed(1)}/10
            </p>
            {item.highlight && (
              <p className={`text-sm font-semibold ${gradeInfo.color}`}>
                {gradeInfo.grade} {gradeInfo.label}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Questions', value: reportData.totalQuestions },
          { label: 'Answered', value: reportData.answeredQuestions },
          reportData.maxPoints != null && {
            label: 'Points',
            value: `${reportData.totalPoints}/${reportData.maxPoints} (${reportData.percentage}%)`,
          },
          { label: 'Recommended', value: reportData.recommendedForNextRound ? '✅ Yes' : '❌ No' },
        ]
          .filter(Boolean)
          .map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-4 text-center shadow-md">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg sm:text-xl font-bold text-indigo-600">{s.value}</p>
            </div>
          ))}
      </div>

      {/* Question-wise feedback */}
      {questionDetails.length > 0 ? (
        <>
          <div className="gradient-hero rounded-3xl p-5 text-center text-white mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">📝 Question-wise Feedback</h2>
            <p className="text-white/90 text-sm">{questionDetails.length} questions reviewed</p>
          </div>

          <div className="space-y-4 mb-8">
            {questionDetails.map((d, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-md border-l-4 border-indigo-500"
              >
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                  <h4 className="font-semibold text-indigo-600 text-sm sm:text-base">
                    Question {idx + 1}: {d.topic}
                    {d.level && <span className="text-gray-400 font-normal"> ({d.level})</span>}
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {d.timeExpired && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        ⏱️ Time expired
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                        d.skipped && d.score === 0 ? 'bg-gray-100 text-gray-500' : scoreColor(d.score)
                      }`}
                    >
                      {d.skipped ? `⏭️ Skipped • ${d.score}/10` : `Score: ${d.score}/10`}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-500 mb-1">Question:</p>
                  <p className="text-sm sm:text-base text-gray-800">{d.question}</p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-3 mb-3 border-l-4 border-yellow-400">
                  <p className="text-xs text-gray-500 mb-1">Your Answer:</p>
                  <p className="text-sm sm:text-base text-gray-800">
                    {d.skipped ? 'You skipped this question.' : d.answer}
                  </p>
                </div>

                {/* Sub-scores (legacy shape only) */}
                {d.subScores && !d.skipped && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                    {Object.entries(d.subScores).map(([label, value]) => (
                      <div key={label} className="text-center">
                        <p className="text-[10px] sm:text-xs text-gray-500">{label}</p>
                        <p className="text-sm sm:text-base font-bold text-indigo-600">{value}/10</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feedback is shown for ALL questions, including skipped ones */}
                {d.feedback && (
                  <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-indigo-700 mb-1">💬 AI Feedback:</p>
                    <p className="text-sm text-gray-700">{d.feedback}</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  {d.missing.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-1">🔍 Missing Concepts:</p>
                      <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1">
                        {d.missing.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  )}
                  {d.extracted.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">💡 Concepts Covered:</p>
                      <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1">
                        {d.extracted.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  )}
                  {d.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">✅ Strengths:</p>
                      <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1">
                        {d.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {d.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-orange-600 mb-1">📚 Improvements:</p>
                      <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1">
                        {d.improvements.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center shadow-md mb-6">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-gray-600">No question details available.</p>
        </div>
      )}

      {/* Overall analysis */}
      {analysisBlocks.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {analysisBlocks.map((b, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-md">
              <h3 className="font-semibold text-lg mb-2">{b.title}</h3>
              <p className="text-sm text-gray-700">{b.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Strengths & improvements */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-semibold text-lg mb-3">✅ Overall Strengths</h3>
          {reportData.strengths?.length > 0 ? (
            <ul className="space-y-2">
              {reportData.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500">✓</span>{s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No specific strengths identified</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-semibold text-lg mb-3">📚 Areas for Improvement</h3>
          {reportData.improvementAreas?.length > 0 ? (
            <ul className="space-y-2">
              {reportData.improvementAreas.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-orange-500">⚠️</span>{s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No specific areas identified</p>
          )}
        </div>
      </div>

      {/* Recommended learning */}
      {reportData.recommendedLearning?.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-md mb-8">
          <h3 className="font-semibold text-lg mb-3">🎯 Recommended Learning Areas</h3>
          <div className="flex flex-wrap gap-2">
            {reportData.recommendedLearning.map((s, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Final feedback */}
      {reportData.finalFeedback && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-5 mb-8">
          <h3 className="font-semibold text-lg text-indigo-700 mb-2">💬 Final Feedback</h3>
          <p className="text-sm sm:text-base text-gray-700">{reportData.finalFeedback}</p>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={downloadReport} className="btn-primary py-2.5">📄 Download Report</button>
        <button onClick={handleNewInterview} className="btn-secondary py-2.5">🔄 Start New Interview</button>
        <button onClick={() => navigate('/profile')} className="btn-secondary py-2.5">👤 View Profile</button>
      </div>
    </div>
  );
};

export default InterviewReport;