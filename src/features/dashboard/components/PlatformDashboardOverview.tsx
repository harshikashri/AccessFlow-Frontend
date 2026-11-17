import { useId } from 'react';
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppIcon } from '@/components/common/AppIcon';
import { DashboardChart } from '@/features/dashboard/components/DashboardChart';
import { DashboardErrorState } from '@/features/dashboard/components/DashboardErrorState';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { APP_ROUTES } from '@/routes/route.constants';
import type {
  DashboardAnalyticsData,
  DashboardAnalyticsProvider,
  DashboardKpi,
} from '@/features/dashboard/types/dashboard.types';
import { formatDashboardKpi } from '@/features/dashboard/utils/dashboard.utils';

interface PlatformDashboardOverviewProps {
  kpis: readonly DashboardKpi[];
  analytics: Map<DashboardAnalyticsProvider, UseQueryResult<DashboardAnalyticsData, Error>>;
}

interface OverviewMetric {
  key: string;
  title: string;
  icon: 'organizations' | 'users' | 'requests' | 'departments';
  href: string;
  description: (kpis: readonly DashboardKpi[]) => string;
}

const overviewMetrics: readonly OverviewMetric[] = [
  {
    key: 'TOTAL_ORGANIZATIONS',
    title: 'Total Organizations',
    icon: 'organizations',
    href: APP_ROUTES.organizations,
    description: (kpis) =>
      `${formatCount(kpis, 'ACTIVE_ORGANIZATIONS')} Active · ${formatCount(kpis, 'INACTIVE_ORGANIZATIONS')} Inactive`,
  },
  {
    key: 'TOTAL_USERS',
    title: 'Total Users',
    icon: 'users',
    href: APP_ROUTES.platformUserAnalytics,
    description: (kpis) =>
      `${formatCount(kpis, 'ACTIVE_USERS')} Active · ${formatCount(kpis, 'INACTIVE_USERS')} Inactive`,
  },
  {
    key: 'TOTAL_REQUESTS',
    title: 'Total Requests',
    icon: 'requests',
    href: APP_ROUTES.platformUsage,
    description: (kpis) =>
      `${formatCount(kpis, 'APPROVED_REQUESTS')} Approved · ${formatCount(kpis, 'CANCELLED_REQUESTS')} Cancelled`,
  },
  {
    key: 'TOTAL_DEPARTMENTS',
    title: 'Total Departments',
    icon: 'departments',
    href: APP_ROUTES.platformOrganizationAnalytics,
    description: () => 'Across all organizations',
  },
];

function findKpi(kpis: readonly DashboardKpi[], key: string): DashboardKpi | undefined {
  return kpis.find((kpi) => kpi.key === key);
}

function formatCount(kpis: readonly DashboardKpi[], key: string): string {
  const kpi = findKpi(kpis, key);
  return kpi ? formatDashboardKpi(kpi.value, kpi.format, kpi.unit) : '—';
}

function OverviewMetricCard({
  metric,
  kpis,
}: {
  metric: OverviewMetric;
  kpis: readonly DashboardKpi[];
}) {
  const kpi = findKpi(kpis, metric.key);
  if (!kpi) return null;

  return (
    <Link
      className="platform-dashboard-kpi"
      to={metric.href}
      aria-label={`${metric.title}: ${formatDashboardKpi(kpi.value, kpi.format, kpi.unit)}. ${metric.description(kpis)}. View details`}
    >
      <span className="platform-dashboard-kpi__icon" aria-hidden="true">
        <AppIcon name={metric.icon} size={21} />
      </span>
      <span className="platform-dashboard-kpi__content">
        <span className="platform-dashboard-kpi__title">{metric.title}</span>
        <strong>{formatDashboardKpi(kpi.value, kpi.format, kpi.unit)}</strong>
        <span className="platform-dashboard-kpi__description">{metric.description(kpis)}</span>
      </span>
      <AppIcon name="chevron" size={18} />
    </Link>
  );
}

function OverviewPanel({
  title,
  icon,
  href,
  query,
  children,
}: {
  title: string;
  icon: 'organizations' | 'users' | 'requests';
  href: string;
  query: UseQueryResult<DashboardAnalyticsData, Error> | undefined;
  children: (data: DashboardAnalyticsData) => ReactNode;
}) {
  const id = useId();

  return (
    <section className="platform-dashboard-panel" aria-labelledby={id}>
      <header className="platform-dashboard-panel__header">
        <h2 id={id}>
          <AppIcon name={icon} size={20} />
          {title}
        </h2>
        <Link to={href}>
          View details <AppIcon name="chevron" size={16} />
        </Link>
      </header>
      <div className="platform-dashboard-panel__content">
        {!query ? (
          <p className="platform-dashboard-panel__message">
            Analytics are not available in the current dashboard configuration.
          </p>
        ) : query.isPending ? (
          <p className="platform-dashboard-panel__message" role="status">
            Loading {title.toLowerCase()}…
          </p>
        ) : query.isError ? (
          <DashboardErrorState
            message={getAuthErrorMessage(query.error, `${title} could not be loaded.`)}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.scope !== 'PLATFORM' ? (
          <DashboardErrorState
            message="The dashboard API returned data for a different scope."
            onRetry={() => void query.refetch()}
          />
        ) : (
          children(query.data)
        )}
      </div>
    </section>
  );
}

function PlatformMembershipPanel({ kpis }: { kpis: readonly DashboardKpi[] }) {
  const total = findKpi(kpis, 'TOTAL_ORGANIZATION_MEMBERSHIPS');
  const active = findKpi(kpis, 'ACTIVE_ORGANIZATION_MEMBERSHIPS');
  const inactive = findKpi(kpis, 'INACTIVE_ORGANIZATION_MEMBERSHIPS');

  return (
    <section
      className="platform-dashboard-panel platform-dashboard-memberships"
      aria-labelledby="platform-memberships-title"
    >
      <header className="platform-dashboard-panel__header">
        <h2 id="platform-memberships-title">
          <AppIcon name="users" size={20} />
          Organization Memberships
        </h2>
        <Link to={APP_ROUTES.platformUserAnalytics}>
          View details <AppIcon name="chevron" size={16} />
        </Link>
      </header>
      <div className="platform-dashboard-memberships__content">
        <div className="platform-dashboard-memberships__total">
          <strong>{total ? formatDashboardKpi(total.value, total.format, total.unit) : '—'}</strong>
          <span>Total Memberships</span>
        </div>
        <dl className="platform-dashboard-memberships__statuses">
          <div>
            <dt>Active</dt>
            <dd>{active ? formatDashboardKpi(active.value, active.format, active.unit) : '—'}</dd>
          </div>
          <div>
            <dt>Inactive</dt>
            <dd>
              {inactive ? formatDashboardKpi(inactive.value, inactive.format, inactive.unit) : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export function PlatformDashboardOverview({ kpis, analytics }: PlatformDashboardOverviewProps) {
  const organizationQuery = analytics.get('ORGANIZATIONS');
  const userQuery = analytics.get('USERS');
  const requestQuery = analytics.get('REQUESTS');

  return (
    <div className="platform-dashboard-overview">
      <div className="platform-dashboard-overview__metrics">
        {overviewMetrics.map((metric) => (
          <OverviewMetricCard key={metric.key} metric={metric} kpis={kpis} />
        ))}
      </div>
      <div className="platform-dashboard-overview__grid">
        <OverviewPanel
          title="Organization Overview"
          icon="organizations"
          href={APP_ROUTES.platformOrganizationAnalytics}
          query={organizationQuery}
        >
          {(data) =>
            'organizationComparison' in data ? (
              <>
                <DashboardChart
                  title="Organizations by status"
                  points={data.statusDistribution.map((item) => ({
                    label: item.status,
                    value: item.count,
                  }))}
                  type="donut"
                  valueLabel="organizations"
                  compact
                />
                <div className="platform-dashboard-panel__highlight">
                  <span>New organizations</span>
                  <strong>{formatCount(kpis, 'NEW_ORGANIZATIONS')}</strong>
                </div>
              </>
            ) : (
              <p className="platform-dashboard-panel__message">Organization data is unavailable.</p>
            )
          }
        </OverviewPanel>
        <OverviewPanel
          title="User Overview"
          icon="users"
          href={APP_ROUTES.platformUserAnalytics}
          query={userQuery}
        >
          {(data) =>
            'membershipCounts' in data ? (
              <DashboardChart
                title="Users by status"
                points={[
                  { label: 'Active users', value: data.userCounts.activeUniqueUsers },
                  { label: 'Inactive users', value: data.userCounts.inactiveUniqueUsers },
                ]}
                type="donut"
                valueLabel="users"
                compact
              />
            ) : (
              <p className="platform-dashboard-panel__message">User data is unavailable.</p>
            )
          }
        </OverviewPanel>
        <PlatformMembershipPanel kpis={kpis} />
        <OverviewPanel
          title="Request Overview"
          icon="requests"
          href={APP_ROUTES.platformUsage}
          query={requestQuery}
        >
          {(data) =>
            'requestTrends' in data ? (
              <DashboardChart
                title="Requests by status"
                points={data.statusDistribution.map((item) => ({
                  label: item.status,
                  value: item.count,
                }))}
                type="donut"
                valueLabel="requests"
                compact
              />
            ) : (
              <p className="platform-dashboard-panel__message">Request data is unavailable.</p>
            )
          }
        </OverviewPanel>
      </div>
    </div>
  );
}
