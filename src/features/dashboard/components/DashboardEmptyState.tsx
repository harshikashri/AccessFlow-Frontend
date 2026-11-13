import { EmptyState } from '@/components/feedback/EmptyState';

export function DashboardEmptyState({
  title = 'No dashboard widgets are available',
  description = 'Your current access does not include any dashboard data.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="dashboard-empty">
      <EmptyState title={title} description={description} />
    </div>
  );
}
