export default function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-2" aria-label="Stackenzo Skill Engine">
      <span className={`grid place-items-center rounded-lg bg-brand font-extrabold text-white ${big ? 'h-10 w-10 text-xl' : 'h-8 w-8 text-base'}`}>S</span>
      <span className={`font-extrabold tracking-tight text-ink ${big ? 'text-2xl' : 'text-lg'}`}>Stackenzo</span>
    </div>
  );
}
