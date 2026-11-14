import { ErrorState } from '@/components/feedback/ErrorState';
import { Button, Card, Skeleton } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import type { useOrganizationSummary } from '@/features/organizations/hooks/useOrganizations';

interface OrganizationSummaryCardsProps {
  query: ReturnType<typeof useOrganizationSummary>;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function OrganizationSummaryCards({ query }: OrganizationSummaryCardsProps) {
  if (query.isPending) {
    return (
      <div className="organization-summary-grid" aria-label="Loading organization statistics">
        {Array.from({ length: 4 }, (_, index) => (
          <Card className="organization-summary-card" key={index}>
            <Skeleton variant="line" />
            <Skeleton variant="line" />
          </Card>
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Organization statistics unavailable"
        description={getAuthErrorMessage(
          query.error,
          'The platform organization summary could not be loaded.',
        )}
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry statistics
          </Button>
        }
      />
    );
  }

  const counts = query.counts;
  if (!counts) return null;
  const summary = [
    { label: 'Total organizations', value: counts.total },
    { label: 'Active organizations', value: counts.active },
    { label: 'Inactive organizations', value: counts.inactive },
  ];

  return (
    <div className="organization-summary-grid">
      {summary.map((item) => (
        <Card className="organization-summary-card" key={item.label}>
          <p>{item.label}</p>
          <strong>{formatNumber(item.value)}</strong>
        </Card>
      ))}
    </div>
  );
}
