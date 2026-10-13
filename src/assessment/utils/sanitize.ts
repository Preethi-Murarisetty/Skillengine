/** Content is rendered as text by React (never dangerouslySetInnerHTML). Only image URLs need validation. */
export const safeImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  return /^(https?:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(url) ? url : undefined;
};
export const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
export const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};
export const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
