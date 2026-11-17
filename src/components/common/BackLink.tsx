import { Link } from 'react-router-dom';
import { AppIcon } from './AppIcon';

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className="page-back-link" to={to} aria-label={label} title={label}>
      <AppIcon name="arrow-left" size={18} />
    </Link>
  );
}
