import React, { useEffect, useRef, useState } from 'react';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const Timer = ({ durationSeconds = 30 * 60, onExpire, isRunning = true }) => {
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, durationSeconds));
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    setSecondsLeft(Math.max(0, durationSeconds));
  }, [durationSeconds]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return undefined;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          onExpireRef.current?.();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, secondsLeft]);

  const isUrgent = secondsLeft <= 60;

  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-700'}`} aria-label={`Time remaining ${formatTime(secondsLeft)}`}>
      <span aria-hidden="true">⏱</span>
      <span className="tabular-nums">{formatTime(secondsLeft)}</span>
    </div>
  );
};

export default Timer;