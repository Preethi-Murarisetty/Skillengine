// src/components/Interview/InterviewReport.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../../hooks/useInterview';

const InterviewReport = () => {
  const { resetInterview } = useInterview();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [questionDetails, setQuestionDetails] = useState([]);

  useEffect(() => {
    const load = () => {
      try {
        // ── 1. Load raw pieces from sessionStorage ──────────────────────
        const rawReport      = sessionStorage.getItem('interviewReport');
        const rawQuestions   = sessionStorage.getItem('interviewQuestions') || sessionStorage.getItem('askedQuestions');
        const rawAnswers     = sessionStorage.getItem('interviewAnswers');
        const rawEvaluations = sessionStorage.getItem('interviewEvaluations');

        if (!rawReport) { setIsLoading(false); return; }

        const report      = JSON.parse(rawReport);
        const questions   = rawQuestions   ? JSON.parse(rawQuestions)   : [];
        const answers     = rawAnswers     ? JSON.parse(rawAnswers)     : [];
        const evaluations = rawEvaluations ? JSON.parse(rawEvaluations) : [];

        setReportData(report);

        // ── 2. Build questionDetails from the three arrays ───────────────
        // Prefer report.questionDetails if it already has answer text
        const backendDetails = report.questionDetails || [];
        const hasRealAnswers = backendDetails.some(
          d => d.answer && d.answer !== 'No answer provided' && d.answer !== ''
        );

        if (hasRealAnswers) {
          setQuestionDetails(backendDetails);
          setIsLoading(false);
          return;
        }

        // Rebuild from sessionStorage arrays (most reliable)
        const maxLen = Math.max(questions.length, answers.length, evaluations.length);
        if (maxLen === 0) {
          // last resort: use backend details even if answers are empty
          setQuestionDetails(backendDetails);
          setIsLoading(false);
          return;
        }

        const rebuilt = [];
        for (let i = 0; i < maxLen; i++) {
          const q   = questions[i]   || {};
          const ans = answers[i]     || {};
          const ev  = evaluations[i] || {};

          const questionText = typeof q === 'string' ? q : (q.question || q.text || `Question ${i + 1}`);
          const topic        = typeof q === 'object' ? (q.category || q.topic || 'General') : 'General';
          const answerText   = typeof ans === 'string' ? ans : (ans.answer || '[Skipped]');

          // evaluation may live inside the answer object or in the evaluations array
          const evaluation = (typeof ans === 'object' && ans.evaluation) ? ans.evaluation : ev;

          rebuilt.push({
            questionNumber: i + 1,
            question: questionText,
            topic,
            category: topic,
            answer: answerText,
            evaluation,
          });
        }

        setQuestionDetails(rebuilt);
      } catch (e) {
        console.error('Error loading report:', e);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleNewInterview = () => {
    resetInterview();
    ['interviewReport','interviewQuestions','interviewAnswers','interviewEvaluations',
     'askedQuestions','interviewSessionId','resumeData','selfIntro','techTermsFound',
     'totalQuestions','questionSource'].forEach(k => sessionStorage.removeItem(k));
    navigate('/');
  };

  const getGrade = (score) => {
    if (score >= 9)  return { grade: 'A+', label: '🏆 Outstanding',    color: 'text-green-600' };
    if (score >= 8)  return { grade: 'A',  label: '🎉 Excellent',       color: 'text-green-500' };
    if (score >= 7)  return { grade: 'B',  label: '👍 Good',            color: 'text-blue-500'  };
    if (score >= 6)  return { grade: 'C',  label: '📚 Average',         color: 'text-yellow-500'};
    if (score >= 5)  return { grade: 'D',  label: '⚠️ Below Average',   color: 'text-orange-500'};
    return           { grade: 'F',  label: '❌ Needs Improvement', color: 'text-red-500'   };
  };

  const scoreColor = (s) => {
    if (s >= 7) return 'bg-green-100 text-green-700';
    if (s >= 5) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
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

  const candidateName = reportData.candidateName || reportData.candidate_name || 'Candidate';
  const overall       = reportData.overallScore   || reportData.overall_score  || 0;
  const gradeInfo     = getGrade(overall);

  const downloadReport = () => {
    let text = `AI TECHNICAL INTERVIEW REPORT\n${'='.repeat(40)}\nCandidate: ${candidateName}\nDate: ${new Date().toLocaleString()}\nOverall Score: ${overall}/10  Grade: ${gradeInfo.grade} ${gradeInfo.label}\n\n`;
    questionDetails.forEach((d, i) => {
      const ev = d.evaluation || {};
      text += `Q${i + 1}. [${d.topic}] Score: ${ev.score || 0}/10\nQuestion: ${d.question}\nAnswer: ${d.answer}\nFeedback: ${ev.feedback || 'N/A'}\nStrengths: ${(ev.strengths || []).join(', ') || 'None'}\nImprovements: ${(ev.improvements || []).join(', ') || 'None'}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `interview_report_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="gradient-hero rounded-3xl p-6 sm:p-8 text-center text-white mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">📊 Interview Report</h1>
        <p className="text-white/90 text-sm sm:text-base">Candidate: {candidateName}</p>
        <p className="text-white/70 text-xs mt-1">{new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: 'Technical',      value: reportData.technicalScore      || 0 },
          { label: 'Communication',  value: reportData.communicationScore  || 0 },
          { label: 'Confidence',     value: reportData.confidenceScore     || 0 },
          { label: 'Overall',        value: overall, highlight: true },
        ].map((item, idx) => (
          <div key={idx} className={`bg-white rounded-xl p-4 text-center shadow-md hover:shadow-xl transition-all duration-300 ${item.highlight ? 'bg-indigo-50 border-2 border-indigo-200' : ''}`}>
            <p className="text-xs sm:text-sm text-gray-500">{item.label}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${item.highlight ? 'text-indigo-700' : 'text-indigo-600'}`}>
              {Number(item.value).toFixed(1)}/10
            </p>
            {item.highlight && (
              <p className={`text-sm font-semibold ${gradeInfo.color}`}>{gradeInfo.grade} {gradeInfo.label}</p>
            )}
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Total Questions', value: reportData.totalQuestions    || questionDetails.length },
          { label: 'Answered',        value: reportData.answeredQuestions || questionDetails.filter(d => d.answer && d.answer !== '[Skipped]').length },
          { label: 'Recommended',     value: reportData.recommendedForNextRound ? '✅ Yes' : '❌ No' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 text-center shadow-md">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-indigo-600">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Question-wise Feedback */}
      {questionDetails.length > 0 ? (
        <>
          <div className="gradient-hero rounded-3xl p-5 text-center text-white mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">📝 Question-wise Feedback</h2>
            <p className="text-white/90 text-sm">{questionDetails.length} questions reviewed</p>
          </div>

          <div className="space-y-4 mb-8">
            {questionDetails.map((d, idx) => {
              const ev = d.evaluation || {};
              const score = ev.score || 0;
              const isSkipped = d.answer === '[Skipped]' || !d.answer;

              return (
                <div key={idx} className="bg-white rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 border-l-4 border-indigo-500">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                    <h4 className="font-semibold text-indigo-600 text-sm sm:text-base">
                      Question {idx + 1}: {d.topic || d.category || 'General'}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${isSkipped ? 'bg-gray-100 text-gray-500' : scoreColor(score)}`}>
                      {isSkipped ? '⏭️ Skipped' : `Score: ${score}/10`}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Question:</p>
                    <p className="text-sm sm:text-base text-gray-800">{d.question}</p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-3 mb-3 border-l-4 border-yellow-400">
                    <p className="text-xs text-gray-500 mb-1">Your Answer:</p>
                    <p className="text-sm sm:text-base text-gray-800">{d.answer || 'No answer provided'}</p>
                  </div>

                  {!isSkipped && (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                        {[
                          { label: 'Technical',      value: ev.technicalAccuracy  || ev.technical_accuracy  || 0 },
                          { label: 'Communication',  value: ev.communicationSkills|| ev.communication_skills|| 0 },
                          { label: 'Confidence',     value: ev.confidence         || 0 },
                          { label: 'Completeness',   value: ev.completeness       || 0 },
                          { label: 'Relevance',      value: ev.relevance          || 0 },
                        ].map((item, i) => (
                          <div key={i} className="text-center">
                            <p className="text-[10px] sm:text-xs text-gray-500">{item.label}</p>
                            <p className="text-sm sm:text-base font-bold text-indigo-600">{item.value}/10</p>
                          </div>
                        ))}
                      </div>

                      {ev.feedback && (
                        <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                          <p className="text-xs font-medium text-indigo-700 mb-1">💬 AI Feedback:</p>
                          <p className="text-sm text-gray-700">{ev.feedback}</p>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-3">
                        {ev.strengths?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-green-600 mb-1">✅ Strengths:</p>
                            <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1">
                              {ev.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {ev.improvements?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-orange-600 mb-1">📚 Improvements:</p>
                            <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1">
                              {ev.improvements.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center shadow-md mb-6">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-gray-600">No question details available.</p>
        </div>
      )}

      {/* Overall Strengths & Improvements */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-semibold text-lg mb-3">✅ Overall Strengths</h3>
          {reportData.strengths?.length > 0 ? (
            <ul className="space-y-2">
              {reportData.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-green-500">✓</span>{s}</li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">No specific strengths identified</p>}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-semibold text-lg mb-3">📚 Areas for Improvement</h3>
          {reportData.improvementAreas?.length > 0 ? (
            <ul className="space-y-2">
              {reportData.improvementAreas.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-orange-500">⚠️</span>{s}</li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">No specific areas identified</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={downloadReport}    className="btn-primary  py-2.5">📄 Download Report</button>
        <button onClick={handleNewInterview} className="btn-secondary py-2.5">🔄 Start New Interview</button>
        <button onClick={() => navigate('/profile')} className="btn-secondary py-2.5">👤 View Profile</button>
      </div>
    </div>
  );
};

export default InterviewReport;
