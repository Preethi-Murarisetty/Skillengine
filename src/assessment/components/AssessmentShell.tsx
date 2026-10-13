import type { ReactNode } from 'react';
import '../assessment.css';

/** Scopes assessment look & feel (cream background, Plus Jakarta Sans) away from the Practice app. */
export default function AssessmentShell({ children }: { children: ReactNode }) {
  return <div className="se-root min-h-screen bg-cream font-assess text-ink antialiased">{children}</div>;
}
