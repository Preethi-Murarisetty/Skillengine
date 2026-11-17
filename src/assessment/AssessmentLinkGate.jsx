import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { setPendingAssessment } from '../utils/pendingAssessment';
import { CORE_API_ENABLED } from '../services/coreApi';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
  </div>
);

const RememberAndRedirect = ({ token, to, state }) => {
  const navigate = useNavigate();

  useEffect(() => {
    setPendingAssessment(token);
    navigate(to, { replace: true, state });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Spinner />;
};

const AssessmentLinkGate = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { token } = useParams();
  const [searchParams] = useSearchParams();

  if (CORE_API_ENABLED) return children;
  if (isLoading) return <Spinner />;

  if (!token) return children;

  if (!isAuthenticated) {
    return (
      <RememberAndRedirect
        token={token}
        to="/login"
        state={{ message: 'Please log in to open your assessment.' }}
      />
    );
  }

  if (searchParams.get('proceed') !== '1') {
    return <RememberAndRedirect token={token} to={`/exam/${encodeURIComponent(token)}?proceed=1`} />;
  }

  return children;
};

export default AssessmentLinkGate;
