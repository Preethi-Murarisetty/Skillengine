import React, { useEffect, useState } from 'react';
import './DashboardProgressBar.css';

const DashboardProgressBar = ({ label, value, status, tone = 'coral' }) => {
  const validValue = value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const clamped = validValue ? Math.min(100, Math.max(0, Number(value))) : 0;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setDisplayed(clamped));
    return () => window.cancelAnimationFrame(frame);
  }, [clamped]);

  const valueText = validValue ? `${Math.round(clamped)}%` : status || 'No data';

  return (
    <div className="dashboard-progress">
      <div className="dashboard-progress-heading">
        <span>{label}</span>
        <strong>{valueText}</strong>
      </div>
      {validValue && (
        <div
          className="dashboard-progress-track"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped)}
        >
          <span className={`dashboard-progress-fill tone-${tone}`} style={{ width: `${displayed}%` }} />
        </div>
      )}
    </div>
  );
};

export default DashboardProgressBar;
