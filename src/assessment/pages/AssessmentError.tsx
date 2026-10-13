import { AlertCircle, RefreshCw } from 'lucide-react';
import Brand from '../components/assessment/Brand';
import type { ErrorKind } from '../utils/errors';

interface Props { message?: string; kind?: ErrorKind; expired?: boolean }

export default function AssessmentError({ message, kind, expired }: Props) {
  const text = message ?? (expired ? 'This assessment is no longer available.' : 'This assessment link is invalid or expired.');
  const retryable = kind === 'network' || kind === 'unknown';
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="se-card w-full max-w-md p-8 text-center">
        <div className="flex justify-center"><Brand size="lg" /></div>
        <AlertCircle className="mx-auto mt-6 text-brand" size={40} aria-hidden />
        <p role="alert" className="mt-3 text-base font-semibold">{text}</p>
        {retryable && (
          <button className="se-btn-primary mt-6" onClick={() => window.location.reload()}><RefreshCw size={16} aria-hidden />Try again</button>
        )}
      </div>
    </main>
  );
}
