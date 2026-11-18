export const formatHMS = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [h, m, s % 60].map((n) => String(n).padStart(2, '0')).join(':');
};
export const formatMinutes = (seconds?: number): string =>
  seconds ? `${Math.round(seconds / 60)} min` : '—';
export const remainingSeconds = (endsAt: number | null): number =>
  endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
