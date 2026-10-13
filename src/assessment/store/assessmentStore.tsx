import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type {
  AssessmentResult,
  AssessmentSession,
  AssessmentStatus,
  AssessmentSubmissionSnapshot,
  CodingSubmission,
  Question,
} from '../types/assessment';

import {
  loadSession,
  saveSession,
} from '../utils/storage';

import type { ErrorKind } from '../utils/errors';

/* ============================================================
   ALLOWED STATUS TRANSITIONS
============================================================ */

const TRANSITIONS: Record<
  AssessmentStatus,
  AssessmentStatus[]
> = {
  VERIFYING: [
    'VERIFIED',
    'ERROR',
    'EXPIRED',
  ],

  VERIFIED: [
    'INSTRUCTIONS',
    'ERROR',
    'EXPIRED',
  ],

  INSTRUCTIONS: [
    'STARTING',
    'IN_PROGRESS',
    'ERROR',
    'EXPIRED',
  ],

  STARTING: [
    'IN_PROGRESS',
    'INSTRUCTIONS',
    'ERROR',
    'EXPIRED',
  ],

  IN_PROGRESS: [
    'SECTION_COMPLETED',
    'SUBMITTING',
    'EXPIRED',
    'ERROR',
  ],

  SECTION_COMPLETED: [
    'IN_PROGRESS',
    'SUBMITTING',
  ],

  SUBMITTING: [
    'COMPLETED',
    'IN_PROGRESS',
    'ERROR',
    'EXPIRED',
  ],

  COMPLETED: [],

  EXPIRED: [],

  ERROR: [
    'VERIFYING',
    'INSTRUCTIONS',
    'IN_PROGRESS',
    'SUBMITTING',
  ],
};

/* ============================================================
   STORE STATE
============================================================ */

export interface StoreState
  extends AssessmentSession {
  questions: Record<
    string,
    Question[]
  >;

  submissions: Record<
    string,
    CodingSubmission
  >;

  result:
    | AssessmentResult
    | null;

  quizEvaluation:
    | AssessmentSubmissionSnapshot
    | null;

  endAssessmentResponse:
    | AssessmentSubmissionSnapshot
    | null;

  quizEvaluationError:
    | string
    | null;

  error:
    | {
        kind: ErrorKind;
        message: string;
      }
    | null;
}

/* ============================================================
   FRESH STATE
============================================================ */

const fresh = (
  token: string,
): StoreState => ({
  token,

  assessmentId: '',

  attemptId: '',

  status: 'VERIFYING',

  sectionIdx: 0,

  questionIdx: 0,

  answers: {},

  marked: [],

  visited: [],

  completedSections: [],

  code: {},

  startedAt: null,

  endsAt: null,

  questionsAssigned: false,

  assessment: null,

  questions: {},

  submissions: {},

  result: null,

  quizEvaluation: null,

  endAssessmentResponse: null,

  quizEvaluationError: null,

  error: null,
});

/* ============================================================
   RESTORE SESSION
============================================================ */

const init = (
  token: string,
): StoreState => {
  let saved: any = null;

  try {
    saved = loadSession(token);
  } catch (error) {
    console.error(
      'Assessment session load failed:',
      error,
    );
  }

  /* ----------------------------------------------------------
     No saved session
  ---------------------------------------------------------- */

  if (!saved) {
    return fresh(token);
  }

  /* ----------------------------------------------------------
     Restore status
  ---------------------------------------------------------- */

  let status: AssessmentStatus =
    saved.status;

  /*
   * Error/Submitting states should not remain
   * permanently after browser refresh.
   */
  if (
    status === 'ERROR' ||
    status === 'SUBMITTING'
  ) {
    status = saved.startedAt
      ? 'IN_PROGRESS'
      : saved.assessment
        ? 'INSTRUCTIONS'
        : 'VERIFYING';
  }

  /*
   * STARTING / VERIFIED are temporary states.
   */
  if (
    status === 'STARTING' ||
    status === 'VERIFIED'
  ) {
    status = saved.assessment
      ? 'INSTRUCTIONS'
      : 'VERIFYING';
  }

  /* ----------------------------------------------------------
     Restore answers
  ---------------------------------------------------------- */

  const answers = Object.fromEntries(
    Object.entries(
      saved.answers ?? {},
    ).map(
      ([
        questionId,
        answer,
      ]) => {
        const stored =
          answer as any;

        return [
          questionId,

          {
            ...stored,

            questionId:
              stored.questionId ||
              questionId,

            selectedOptionId:
              stored.selectedOptionId ??
              stored.optionId ??
              null,
          },
        ];
      },
    ),
  );

  /* ----------------------------------------------------------
     Restore questions
  ---------------------------------------------------------- */

  const questions =
    saved.questions ?? {};

  /* ----------------------------------------------------------
     Restore section
  ---------------------------------------------------------- */

  const sectionIdx =
    typeof saved.sectionIdx ===
    'number'
      ? saved.sectionIdx
      : 0;

  /* ----------------------------------------------------------
     Restore question
  ---------------------------------------------------------- */

  const questionIdx =
    typeof saved.questionIdx ===
    'number'
      ? saved.questionIdx
      : 0;

  /* ----------------------------------------------------------
     Restore marked questions
  ---------------------------------------------------------- */

  const marked =
    Array.isArray(saved.marked)
      ? saved.marked
      : [];

  /* ----------------------------------------------------------
     Restore visited questions
  ---------------------------------------------------------- */

  const visited =
    Array.isArray(saved.visited)
      ? saved.visited
      : [];

  /* ----------------------------------------------------------
     Restore completed sections
  ---------------------------------------------------------- */

  const completedSections =
    Array.isArray(
      saved.completedSections,
    )
      ? saved.completedSections
      : [];

  /* ----------------------------------------------------------
     Restore code answers
  ---------------------------------------------------------- */

  const code =
    saved.code &&
    typeof saved.code === 'object'
      ? saved.code
      : {};

  /* ----------------------------------------------------------
     Restore final state
  ---------------------------------------------------------- */

  return {
    ...fresh(token),

    ...saved,

    /*
     * Always use the current URL token.
     */
    token,

    status,

    questions,

    answers,

    marked,

    visited,

    completedSections,

    code,

    sectionIdx,

    questionIdx,

    /*
     * Never restore old transient error.
     */
    error: null,
  };
};

/* ============================================================
   CONTEXT
============================================================ */

interface Ctx {
  state: StoreState;

  patch: (
    p:
      | Partial<StoreState>
      | ((
          s: StoreState,
        ) => Partial<StoreState>),
  ) => void;

  transition: (
    to: AssessmentStatus,
    extra?: Partial<StoreState>,
  ) => boolean;
}

const StoreContext =
  createContext<Ctx | null>(
    null,
  );

/* ============================================================
   ASSESSMENT PROVIDER
============================================================ */

export function AssessmentProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  /* ----------------------------------------------------------
     Initialize from storage
  ---------------------------------------------------------- */

  const [
    state,
    setState,
  ] = useState<StoreState>(
    () => init(token),
  );

  /* ----------------------------------------------------------
     Synchronous state reference
  ---------------------------------------------------------- */

  const ref = useRef<StoreState>(
    state,
  );

  useEffect(() => {
    ref.current = state;
  }, [state]);

  /* ----------------------------------------------------------
     PATCH
  ---------------------------------------------------------- */

  const patch = useCallback<
    Ctx['patch']
  >(
    (p) => {
      setState((current) => {
        const next = {
          ...current,

          ...(typeof p ===
          'function'
            ? p(current)
            : p),
        };

        /*
         * Keep ref synchronized immediately.
         */
        ref.current = next;

        return next;
      });
    },
    [],
  );

  /* ----------------------------------------------------------
     TRANSITION
  ---------------------------------------------------------- */

  const transition =
    useCallback<
      Ctx['transition']
    >(
      (to, extra) => {
        const from =
          ref.current.status;

        /*
         * Same-state transition is allowed.
         */
        if (
          from !== to &&
          !TRANSITIONS[
            from
          ].includes(to)
        ) {
          if (
            import.meta.env.DEV
          ) {
            console.warn(
              `[assessment] blocked transition: ${from} -> ${to}`,
            );
          }

          return false;
        }

        const next: StoreState = {
          ...ref.current,

          ...(extra ?? {}),

          status: to,
        };

        /*
         * Update ref immediately.
         */
        ref.current = next;

        /*
         * Update React state.
         */
        setState(next);

        return true;
      },
      [],
    );

  /* ==========================================================
     PERSIST ASSESSMENT SESSION
  ========================================================== */

  useEffect(() => {
    /*
     * Don't save anything before assessment verification
     * has actually started.
     */
    if (
      !state.assessmentId &&
      state.status === 'VERIFYING'
    ) {
      return;
    }

    /*
     * Remove only temporary/large fields.
     *
     * IMPORTANT:
     * questions MUST remain.
     *
     * This is what allows browser refresh recovery.
     */
    const {
      submissions:
        _submissions,

      result:
        _result,

      quizEvaluation:
        _quizEvaluation,

      endAssessmentResponse:
        _endAssessmentResponse,

      quizEvaluationError:
        _quizEvaluationError,

      error:
        _error,

      ...session
    } = state;

    /*
     * Silence unused variable warnings.
     */
    void _submissions;
    void _result;
    void _quizEvaluation;
    void _endAssessmentResponse;
    void _quizEvaluationError;
    void _error;

    try {
      saveSession({
        ...session,

        /*
         * Explicitly keep these fields.
         */
        token: state.token,

        questions:
          state.questions,

        sectionIdx:
          state.sectionIdx,

        questionIdx:
          state.questionIdx,

        answers:
          state.answers,

        marked:
          state.marked,

        visited:
          state.visited,

        completedSections:
          state.completedSections,

        code:
          state.code,

        startedAt:
          state.startedAt,

        endsAt:
          state.endsAt,

        assessmentId:
          state.assessmentId,

        attemptId:
          state.attemptId,

        status:
          state.status,

        assessment:
          state.assessment,

        questionsAssigned:
          state.questionsAssigned,
      });
    } catch (error) {
      console.error(
        'Failed to save assessment session:',
        error,
      );
    }
  }, [state]);

  /* ==========================================================
     CONTEXT VALUE
  ========================================================== */

  const value = useMemo(
    () => ({
      state,
      patch,
      transition,
    }),
    [
      state,
      patch,
      transition,
    ],
  );

  return (
    <StoreContext.Provider
      value={value}
    >
      {children}
    </StoreContext.Provider>
  );
}

/* ============================================================
   HOOK
============================================================ */

export const useAssessmentStore =
  (): Ctx => {
    const context =
      useContext(StoreContext);

    if (!context) {
      throw new Error(
        'useAssessmentStore must be used within AssessmentProvider',
      );
    }

    return context;
  };