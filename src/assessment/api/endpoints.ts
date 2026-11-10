import { MissingEndpointError } from '../utils/errors';

export type EndpointName =
  | 'GENERATE_KEY'
  | 'VERIFY_KEY'
  | 'START'
  | 'END'
  | 'ASSESSMENT_DETAILS'
  | 'QUESTIONS'
  | 'SAVE_CODING'
  | 'SESSION'
  | 'RESULT';

export interface ResolvedEndpoint {
  method: 'get' | 'post' | 'put' | 'patch';
  url: string;
}

const raw: Record<EndpointName, string | undefined> = {
  GENERATE_KEY: import.meta.env.VITE_EP_GENERATE_KEY || 'POST /assessment/{token}/generate-key',
  VERIFY_KEY: import.meta.env.VITE_EP_VERIFY_KEY || 'POST /assessment/{token}/verify-key',
  START: import.meta.env.VITE_EP_START || 'POST /assessment/{token}/start',
  END: import.meta.env.VITE_EP_END || 'POST /assessment/{token}/end',
  ASSESSMENT_DETAILS: import.meta.env.VITE_EP_ASSESSMENT_DETAILS,
  QUESTIONS: import.meta.env.VITE_EP_QUESTIONS,
  SAVE_CODING: import.meta.env.VITE_EP_SAVE_CODING,
  SESSION: import.meta.env.VITE_EP_SESSION,
  RESULT: import.meta.env.VITE_EP_RESULT,
};

export const isConfigured = (name: EndpointName): boolean =>
  Boolean(raw[name]?.trim());

export const resolve = (
  name: EndpointName,
  params: Record<string, string>
): ResolvedEndpoint => {
  const template = raw[name]?.trim();

  if (!template) {
    throw new MissingEndpointError(name);
  }

  const parts = template.split(/\s+/);

  const method = (
    parts.length > 1 ? parts[0] : 'get'
  ).toLowerCase() as ResolvedEndpoint['method'];

  const path = parts.length > 1
    ? parts.slice(1).join(' ')
    : parts[0];

  const url = path.replace(
    /\{(\w+)\}/g,
    (_, key: string) => encodeURIComponent(params[key] ?? '')
  );

  return { method, url };
};
