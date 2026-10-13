import { useEffect, useRef, useState } from 'react';
import { remainingSeconds } from '../utils/timer';

/** Ticks once per second against an absolute end time; fires onExpire exactly once. */
export function useAssessmentTimer(endsAt: number | null, active: boolean, onExpire: () => void) {
  const [remaining, setRemaining] = useState(() => remainingSeconds(endsAt));
  const fired = useRef(false);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    fired.current = false;
    setRemaining(remainingSeconds(endsAt));
    if (!active || endsAt === null) return;
    const tick = () => {
      const r = remainingSeconds(endsAt);
      setRemaining(r);
      if (r <= 0 && !fired.current) { fired.current = true; cb.current(); }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt, active]);

  return { remaining, warning: remaining > 0 && remaining < 300, expired: endsAt !== null && remaining <= 0 };
}
