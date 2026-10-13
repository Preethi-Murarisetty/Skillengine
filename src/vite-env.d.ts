/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_JUDGE0_URL?: string;
  /** Optional backend endpoint templates (use {token} / {assessmentId}). See README. */
  readonly VITE_EP_VERIFY_KEY?: string;
  readonly VITE_EP_ASSESSMENT_DETAILS?: string;
  readonly VITE_EP_QUESTIONS?: string;
  readonly VITE_EP_SAVE_CODING?: string;
  readonly VITE_EP_SESSION?: string;
  readonly VITE_EP_RESULT?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
