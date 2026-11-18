import { Check } from 'lucide-react';

export interface FlowStep {
  no: number;
  title: string;
  hint: string;
}

/** Project Flow Document §5.1 – Institution journey. */
export const INSTITUTION_FLOW: FlowStep[] = [
  { no: 1, title: 'Admin login', hint: 'Open the examination dashboard' },
  { no: 2, title: 'Create & schedule exam', hint: 'Time window, duration, sections' },
  { no: 3, title: 'Select candidates', hint: 'Institution, department, year, section, individual' },
  { no: 4, title: 'Publish exam', hint: 'Assign and notify with access links' },
  { no: 5, title: 'Link & OTP verification', hint: 'Eligibility, schedule, OTP' },
  { no: 6, title: 'MCQ & coding', hint: 'Objective and programming assessment' },
  { no: 7, title: 'Evaluate & qualify', hint: 'Score and interview eligibility' },
  { no: 8, title: 'Interview', hint: 'Eligible students attend the interview' },
  { no: 9, title: 'Results', hint: 'Student and institution reports' },
];

/** Project Flow Document §5.2 – Individual journey. */
export const INDIVIDUAL_FLOW: FlowStep[] = [
  { no: 1, title: 'Register & upload resume', hint: 'PDF or DOCX' },
  { no: 2, title: 'Extract & confirm skills', hint: 'Review and correct' },
  { no: 3, title: 'Recommend roles', hint: 'Based on confirmed skills' },
  { no: 4, title: 'Select career goal', hint: 'Pick or enter a target role' },
  { no: 5, title: 'Identify skill gaps', hint: 'Current skills vs role requirements' },
  { no: 6, title: 'Skill-wise interview', hint: 'Role-based questions and evaluation' },
  { no: 7, title: 'Generate report', hint: 'Scores, strengths, gaps, feedback' },
  { no: 8, title: 'Subscription learning plan', hint: 'Personalized weekly roadmap' },
  { no: 9, title: 'Practice & reassess', hint: 'Learn, practise, track improvement' },
];

interface FlowStepperProps {
  flow: 'institution' | 'individual';
  /** Step number (1-based) the user is on now. Earlier steps show as done. */
  current: number;
  /** Show only steps from this number (e.g. 5 for the candidate side of the institution flow). */
  from?: number;
  /** Show only steps up to this number (e.g. 4 for the admin create screen). */
  to?: number;
  /** Hide step hints (use on busy screens such as the live exam). */
  compact?: boolean;
  /** When true, `current` itself is also shown as done (e.g. the exam has been published). */
  currentDone?: boolean;
}

/** Horizontal progress indicator for the two journeys in the Project Flow Document. */
export default function FlowStepper({
  flow, current, from = 1, to, compact = false, currentDone = false,
}: FlowStepperProps) {
  const steps = (flow === 'institution' ? INSTITUTION_FLOW : INDIVIDUAL_FLOW)
    .filter((step) => step.no >= from && (to === undefined || step.no <= to));

  return (
    <nav
      aria-label={flow === 'institution' ? 'Institution assessment progress' : 'Career assessment progress'}
      className="mx-auto w-full max-w-5xl overflow-x-auto px-4 py-3"
    >
      <ol className="flex min-w-max items-start gap-2">
        {steps.map((step, index) => {
          const done = step.no < current || (currentDone && step.no === current);
          const active = step.no === current && !currentDone;
          return (
            <li
              key={step.no}
              aria-current={active ? 'step' : undefined}
              className="flex items-start gap-2"
              style={{ minWidth: compact ? 120 : 150 }}
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: done ? '#16a34a' : active ? '#f4511e' : '#e7e5e4',
                  color: done || active ? '#fff' : '#78716c',
                }}
              >
                {done ? <Check size={14} /> : step.no}
              </span>
              <span className="block text-xs leading-tight">
                <span className={`block font-semibold ${active ? 'text-orange-600' : done ? 'text-green-700' : 'text-stone-500'}`}>
                  {step.title}
                </span>
                {!compact && <span className="mt-0.5 block text-stone-500">{step.hint}</span>}
                <span className="sr-only">{done ? ' (completed)' : active ? ' (current step)' : ' (upcoming)'}</span>
              </span>
              {index < steps.length - 1 && (
                <span aria-hidden className="mt-3 h-px w-4 shrink-0 bg-stone-300" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
