import { useParams } from 'react-router-dom';
import { AssessmentProvider, useAssessmentStore } from './store/assessmentStore';
import AssessmentShell from './components/AssessmentShell';
import AssessmentVerification from './pages/AssessmentVerification';
import AssessmentInstructionsPage from './pages/AssessmentInstructionsPage';
import AssessmentPage from './pages/AssessmentPage';
import AssessmentCompleted from './pages/AssessmentCompleted';
import AssessmentError from './pages/AssessmentError';

/** Renders the screen that matches the current assessment status (state machine). */
function Flow() {
  const { state } = useAssessmentStore();
  switch (state.status) {
    case 'VERIFYING': case 'VERIFIED': return <AssessmentVerification />;
    case 'INSTRUCTIONS': case 'STARTING': return <AssessmentInstructionsPage />;
    case 'IN_PROGRESS': case 'SECTION_COMPLETED': case 'SUBMITTING': return <AssessmentPage />;
    case 'COMPLETED': return <AssessmentCompleted />;
    case 'EXPIRED': return <AssessmentError expired message={state.error?.message} />;
    case 'ERROR': return <AssessmentError message={state.error?.message} kind={state.error?.kind} />;
  }
}

/** Mounted at the public route /exam/:token and /assessment/:token (no login needed; the token is the credential). */
export default function AssessmentRoutes() {
  const { token } = useParams<{ token: string }>();
  return (
    <AssessmentShell>
      {token
        ? <AssessmentProvider key={token} token={token}><Flow /></AssessmentProvider>
        : <AssessmentError />}
    </AssessmentShell>
  );
}
