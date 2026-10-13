import React from 'react';

const ProgressBar = ({ progress, label = '', showPercentage = false }) => {
  const numericProgress = Number(progress);
  const clampedProgress = Number.isFinite(numericProgress)
    ? Math.min(Math.max(numericProgress, 0), 100)
    : 0;

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>}
      <div
        className="progress-bar"
        role="progressbar"
        aria-label={label || 'Progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clampedProgress)}
      >
        <div 
          className="progress-fill" 
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(clampedProgress)}%</p>
      )}
    </div>
  );
};

export default ProgressBar;