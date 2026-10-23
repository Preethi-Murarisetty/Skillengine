import BrandLogo from '../../../components/common/BrandLogo';

export default function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const sizeClass = size === 'lg'
    ? 'assessment-brand-logo assessment-brand-logo--large'
    : 'assessment-brand-logo assessment-brand-logo--compact';

  return <BrandLogo className={sizeClass} />;
}
