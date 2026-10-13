import { useEffect, useRef, useState } from 'react';
import { getUserInterviewHistory } from '../services/interviewHistory';

export const useInterviewHistory = (user) => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    const userKey = user?.id ?? user?.user_id ?? user?.userId ?? user?.email ?? '';
    const load = async () => {
      const requestId = ++requestIdRef.current;
      setSessions([]);
      setIsLoading(true);
      setError(false);
      try {
        const result = await getUserInterviewHistory(user);
        if (active && requestId === requestIdRef.current) setSessions(result);
      } catch {
        if (active && requestId === requestIdRef.current) setError(true);
      } finally {
        if (active && requestId === requestIdRef.current) setIsLoading(false);
      }
    };

    void load();
    window.addEventListener('skillengine:interviews-updated', load);
    return () => {
      active = false;
      requestIdRef.current += 1;
      window.removeEventListener('skillengine:interviews-updated', load);
    };
  }, [user?.id, user?.user_id, user?.userId, user?.email]);

  return { sessions, isLoading, error };
};
