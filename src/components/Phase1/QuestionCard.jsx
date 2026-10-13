import React from 'react';

const QuestionCard = ({ question, selectedAnswer, onSelect }) => {
  const isCommunication = question.section === 'communication';

  return (
    <section className="card !shadow-md" aria-labelledby={`question-${question.id}`}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          {question.topic || question.category}
        </span>
        {isCommunication && <span className="text-xs text-gray-500">Choose the response you would be most likely to take.</span>}
      </div>
      <h2 id={`question-${question.id}`} className="text-xl font-bold leading-relaxed text-gray-800">
        {question.question}
      </h2>
      <div className="mt-6 grid gap-3">
        {question.options.map((option, index) => {
          const value = isCommunication ? option.text : option;
          const isSelected = isCommunication ? selectedAnswer?.text === option.text : selectedAnswer === option;
          return (
            <button
              type="button"
              key={`${question.id}-${value}`}
              onClick={() => onSelect(option)}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
              aria-pressed={isSelected}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {String.fromCharCode(65 + index)}
              </span>
              <span className="pt-0.5">{value}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default QuestionCard;