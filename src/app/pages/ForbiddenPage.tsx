import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/feedback/EmptyState';
import { APP_ROUTES } from '@/routes/route.constants';

export function ForbiddenPage() {
  return (
    <div className="workspace-placeholder workspace-placeholder--forbidden">
      <EmptyState
        title="Access not available"
        description="Your current session does not have the permission and scope required for this route."
        action={<Link to={APP_ROUTES.root}>Return to your workspace</Link>}
      />
    </div>
  );
}
