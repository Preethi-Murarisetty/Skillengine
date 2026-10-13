import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const QuizStart = () => {
  const navigate = useNavigate();
  const location = useLocation();

  let configuration = location.state;

  if (!configuration) {
    try {
      configuration = JSON.parse(localStorage.getItem("quizConfiguration"));
    } catch {
      configuration = null;
    }
  }

  if (!configuration) {
    return (
      <div className="w-full">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Quiz Configuration Not Found
            </h1>

            <p className="text-gray-500 mt-2">
              Please configure your quiz before starting.
            </p>

            <button
              type="button"
              onClick={() => navigate("/quiz")}
              className="mt-6 px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600"
            >
              Go to Quiz Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleStartQuiz = () => {
    navigate("/Phase1Test", { state: configuration });
  };

  const details = [
    ["Category", configuration.category],
    ["Subject", configuration.subject],
    ["Topic", configuration.topic],
    ["Questions", configuration.numberOfQuestions],
    ["Difficulty", configuration.difficulty],
  ];

  const instructions = [
    "Questions will be displayed one at a time.",
    "You can move between questions using Previous and Next.",
    "You can skip questions and return to them later.",
    "You can select any question from the question navigator.",
    "The timer will continue running throughout the quiz.",
    "When the timer reaches zero, the quiz will be submitted automatically.",
    "Clicking Submit will show a final confirmation.",
    "After final confirmation, your result will be displayed.",
  ];

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 text-xl font-bold">
              Q
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Quiz Instructions
              </h1>
              <p className="text-gray-500 mt-2">
                Review your quiz details and instructions before starting.
              </p>
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {details.map(([label, value]) => (
              <div key={label} className="border border-gray-200 rounded-xl p-5">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="font-semibold text-gray-900 mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              Instructions
            </h2>

            <div className="space-y-3 text-sm text-gray-700">
              {instructions.map((text) => (
                <p key={text}>• {text}</p>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center mt-8">
            <button
              type="button"
              onClick={() => navigate("/quiz")}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={handleStartQuiz}
              className="px-8 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition shadow-sm"
            >
              Start Quiz →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizStart;