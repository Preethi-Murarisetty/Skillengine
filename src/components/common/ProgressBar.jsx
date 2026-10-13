import React from 'react';

const ProgressBar = ({ progress, label = '', showPercentage = false }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>}
      <div className="progress-bar">
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