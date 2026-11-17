import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsWidget } from '@/features/dashboard/components/AnalyticsWidget';
import type {
  ApprovalAnalytics,
  DashboardWidget,
} from '@/features/dashboard/types/dashboard.types';

const widget: DashboardWidget = {
  key: 'APPROVAL_ACTIVITY',
  title: 'Approval activity',
  description: 'Recorded decisions and stage activity.',
  category: 'APPROVALS',
  scope: 'AUTHORIZED_APPROVAL_ASSIGNMENTS',
  supportedFilters: ['dateRange'],
  kpiProvider: null,
  kpiStatus: 'DEFERRED',
  analyticsProvider: 'APPROVALS',
  analyticsStatus: 'IMPLEMENTED',
};

const analytics: ApprovalAnalytics = {
  scope: 'AUTHORIZED_APPROVAL_ASSIGNMENTS',
  approvalStatusDistribution: [],
  decisions: [
    { decision: 'APPROVED', count: 2 },
    { decision: 'REJECTED', count: 1 },
    { decision: 'RETURNED', count: 0 },
  ],
  stages: [],
  workload: {
    pendingApprovalStages: 0,
    availableToClaimStages: 0,
    currentlyOverdueStages: 0,
  },
  performance: {
    completedDecisions: 3,
    delegatedDecisions: 1,
    averageDecisionMinutes: null,
    medianDecisionMinutes: null,
    slaDecisionSampleSize: 0,
    onTimeDecisions: 0,
    overdueDecisions: 0,
    slaCompliancePercentage: null,
  },
  dateRange: {
    range: 'LAST_30_DAYS',
    fromDate: '2026-10-15T00:00:00.000Z',
    toDate: '2026-11-14T00:00:00.000Z',
    timeZone: 'UTC',
    interval: '[fromDate, toDate)',
  },
};

function AnalyticsHarness() {
  const query = useQuery({
    queryKey: ['approval-analytics-test'],
    queryFn: async () => analytics,
    initialData: analytics,
  });
  return (
    <AnalyticsWidget
      widget={widget}
      query={query}
      activityPage={1}
      onActivityPageChange={vi.fn()}
    />
  );
}

describe('Approval activity analytics widget', () => {
  it('charts decision outcomes without counting delegated decisions twice', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsHarness />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('img', {
        name: 'Recorded approval decisions: APPROVED, 2 records; REJECTED, 1 records; RETURNED, 0 records',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Decisions made as delegate')).toBeTruthy();
  });
});
