import { Link } from 'react-router-dom';
import { AppIcon } from './AppIcon';
import type { AppIconName } from './AppIcon';

export function IconLink({
  to,
  label,
  icon,
  className = '',
}: {
  to: string;
  label: string;
  icon: AppIconName;
  className?: string;
}) {
  return (
    <Link
      className={['ui-icon-link', className].filter(Boolean).join(' ')}
      to={to}
      aria-label={label}
      title={label}
    >
      <AppIcon name={icon} size={16} />
    </Link>
  );
}
