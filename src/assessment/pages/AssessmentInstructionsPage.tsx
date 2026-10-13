import Brand from '../components/assessment/Brand';
import AssessmentInstructions from '../components/assessment/AssessmentInstructions';
import { useAssessment } from '../hooks/useAssessment';

export default function AssessmentInstructionsPage() {
  const { assessment, state, start } = useAssessment();
  if (!assessment) return null;
  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="mb-6 flex justify-center"><Brand size="lg" /></div>
      <AssessmentInstructions assessment={assessment} starting={state.status === 'STARTING'} onStart={start} />
    </main>
  );
}
