import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyRound,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

import Brand from '../components/assessment/Brand';
import { useAssessment } from '../hooks/useAssessment';
import { classifyError } from '../utils/errors';

interface Form {
  key: string;
}

export default function AssessmentVerification() {
  const { state, verify, requestKey } = useAssessment();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>();

  const [invalid, setInvalid] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const generatedOnce = useRef(false);

  const generate = useCallback(async () => {
    setSending(true);
    setNote(null);
    setInvalid(false);
    setGeneratedKey(null);
    setExpires(null);

    try {
      const result = await requestKey();

      if (!result.success) {
        throw new Error(result.message || 'The server could not generate the verification key.');
      }

      const key = result.verificationKey ?? result.key;

      if (key) {
        setGeneratedKey(key);
        setValue('key', key, { shouldValidate: true, shouldDirty: true });
        setNote({ ok: true, text: result.message || 'Verification key generated successfully.' });
      } else {
        setNote({
          ok: true,
          text: result.message || 'Verification key sent. Please check your email.',
        });
      }

      if (result.expiresAt) {
        setExpires(new Date(result.expiresAt).toLocaleString());
      } else if (result.expiresIn) {
        setExpires(`${result.expiresIn} seconds`);
      }
    } catch (error) {
      setNote({ ok: false, text: classifyError(error).message });
    } finally {
      setSending(false);
    }
  }, [requestKey, setValue]);

  useEffect(() => {
    if (generatedOnce.current) return;
    generatedOnce.current = true;
    void generate();
  }, [generate]);

  /**
   * Verify the key.
   * On success, verify() transitions the store to INSTRUCTIONS via the state machine.
   * AssessmentRoutes renders AssessmentInstructionsPage when status === 'INSTRUCTIONS'.
   * No manual navigation needed.
   */
  const onSubmit = async ({ key }: Form) => {
    setInvalid(false);
    setNote(null);

    const cleanKey = key.trim();
    if (!cleanKey) return;

    try {
      const ok = await verify(cleanKey);

      if (!ok) {
        setInvalid(true);
        setNote({
          ok: false,
          text: 'Invalid or expired verification key. Please generate a new key and try again.',
        });
      }
      // On success, the store transitions to INSTRUCTIONS and AssessmentRoutes
      // automatically renders AssessmentInstructionsPage — no navigate() needed.
    } catch (error) {
      setInvalid(true);
      setNote({ ok: false, text: classifyError(error).message });
    }
  };

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="se-card w-full max-w-md p-6 sm:p-8">

        <div className="flex justify-center">
          <Brand size="lg" />
        </div>

        <h1 className="mt-6 text-center text-xl font-bold">
          Assessment Verification
        </h1>

        <p className="mt-2 text-center text-sm text-gray-600">
          Verify your assessment link before starting the assessment.
        </p>

        <div className="mt-5 rounded-xl border border-stone-200 bg-white/70 p-4 text-sm text-gray-600">
          <div className="font-semibold text-gray-800">Assessment token verified</div>
          <div className="mt-1 break-all font-mono text-xs text-gray-500">{state.token}</div>
        </div>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={sending || isSubmitting}
          className="se-btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          {sending ? 'Generating key...' : 'Generate / Regenerate Key'}
        </button>

        {generatedKey && (
          <div className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-green-700">
              <CheckCircle2 size={18} />
              Verification Key
            </div>
            <div className="mt-3 font-mono text-3xl font-bold tracking-[0.25em] text-green-800">
              {generatedKey}
            </div>
            {expires && (
              <div className="mt-2 text-xs text-green-700">Expires: {expires}</div>
            )}
          </div>
        )}

        {note && (
          <p
            role="status"
            className={`mt-3 text-center text-sm ${note.ok ? 'text-green-700' : 'text-red-700'}`}
          >
            {note.text}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="verification-key" className="block text-sm font-semibold text-gray-700">
              Enter Verification Key
            </label>
            <div className="relative mt-1">
              <KeyRound
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                id="verification-key"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter the key from your email"
                aria-invalid={invalid || Boolean(errors.key)}
                className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm ${
                  invalid || errors.key
                    ? 'border-red-400 bg-red-50'
                    : 'border-stone-300 bg-white'
                }`}
                {...register('key', { required: 'Please enter the verification key.' })}
              />
            </div>
            {errors.key && (
              <p role="alert" className="mt-1 text-xs text-red-700">{errors.key.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || sending}
            className="se-btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {isSubmitting ? 'Verifying...' : 'Verify Key'}
          </button>
        </form>
      </div>
    </main>
  );
}
