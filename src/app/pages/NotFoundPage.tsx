import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/feedback/EmptyState';
import { APP_ROUTES } from '@/routes/route.constants';

export function NotFoundPage() {
  return (
    <div className="workspace-placeholder">
      <EmptyState
        title="Page not found"
        description="The page you requested does not exist in this workspace."
        action={<Link to={APP_ROUTES.root}>Return to your workspace</Link>}
      />
    </div>
  );
}
