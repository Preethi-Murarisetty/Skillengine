import './BrandLogo.css';

type BrandLogoProps = {
  alt?: string;
  className?: string;
  variant?: 'full' | 'mark';
};

const logoSource = '/SkillEngine%20Logo%20with%20Graduation%20Cap.png';

export default function BrandLogo({
  alt = 'SkillEngine — Learn, Practice, Grow',
  className = '',
  variant = 'full',
}: BrandLogoProps) {
  const isMark = variant === 'mark';
  const imageSource = isMark ? '/favicon.svg' : logoSource;

  return (
    <span className={`brand-logo brand-logo--${variant}${className ? ` ${className}` : ''}`}>
      <img
        className="brand-logo__image"
        src={imageSource}
        alt={isMark ? '' : alt}
        aria-hidden={isMark || undefined}
        decoding="async"
        draggable="false"
      />
    </span>
  );
}
