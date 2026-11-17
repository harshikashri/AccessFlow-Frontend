import { useId } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppIcon } from '@/components/common/AppIcon';
import type { AppIconName } from '@/components/common/AppIcon';
import { DashboardChart } from '@/features/dashboard/components/DashboardChart';
import { DashboardErrorState } from '@/features/dashboard/components/DashboardErrorState';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { APP_ROUTES } from '@/routes/route.constants';
import type {
  DashboardAnalyticsData,
  DashboardAnalyticsProvider,
  DashboardKpi,
  DashboardWidget,
  DepartmentAnalytics,
  RequestAnalytics,
  UserAnalytics,
} from '@/features/dashboard/types/dashboard.types';
import { formatDashboardKpi } from '@/features/dashboard/utils/dashboard.utils';

type AnalyticsQueries = Map<
  DashboardAnalyticsProvider,
  UseQueryResult<DashboardAnalyticsData, Error>
>;
type MetricTone = 'primary' | 'success' | 'warning' | 'error' | 'information';

interface MetricCardData {
  key: string;
  title: string;
  value: string;
  icon: AppIconName;
  tone: MetricTone;
  href: string;
}

function findKpi(kpis: readonly DashboardKpi[], keys: readonly string[]): DashboardKpi | undefined {
  return kpis.find((kpi) => keys.includes(kpi.key));
}

function formatKpi(kpi: DashboardKpi | undefined): string | undefined {
  return kpi ? formatDashboardKpi(kpi.value, kpi.format, kpi.unit) : undefined;
}

function getRequestCount(
  kpis: readonly DashboardKpi[],
  analytics: RequestAnalytics | undefined,
  keys: readonly string[],
  statuses: readonly string[],
): string | undefined {
  const kpiValue = formatKpi(findKpi(kpis, keys));
  if (kpiValue !== undefined) return kpiValue;

  const status = analytics?.statusDistribution.find((item) =>
    statuses.includes(item.status.toUpperCase()),
  );
  return status ? new Intl.NumberFormat().format(status.count) : undefined;
}

function getRequestAnalytics(
  data: DashboardAnalyticsData | undefined,
): RequestAnalytics | undefined {
  return data && data.scope !== 'PLATFORM' && 'requestVolumeComparison' in data ? data : undefined;
}

function getUserAnalytics(data: DashboardAnalyticsData | undefined): UserAnalytics | undefined {
  return data && data.scope !== 'PLATFORM' && 'userCounts' in data ? data : undefined;
}

function getDepartmentAnalytics(
  data: DashboardAnalyticsData | undefined,
): DepartmentAnalytics | undefined {
  return data &&
    data.scope !== 'PLATFORM' &&
    ('departmentDirectory' in data || 'departments' in data)
    ? data
    : undefined;
}

function hasWidget(widgets: readonly DashboardWidget[], key: string): boolean {
  return widgets.some((widget) => widget.key === key);
}

function AnalyticsFeedback({
  query,
  title,
}: {
  query: UseQueryResult<DashboardAnalyticsData, Error> | undefined;
  title: string;
}) {
  if (!query) return null;
  if (query.isPending) {
    return (
      <p className="organization-dashboard__loading" role="status">
        Loading {title.toLowerCase()}…
      </p>
    );
  }
  if (query.isError) {
    return (
      <DashboardErrorState
        message={getAuthErrorMessage(query.error, `${title} could not be loaded.`)}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (query.data.scope === 'PLATFORM') {
    return (
      <DashboardErrorState
        message="The dashboard API returned data for a different scope."
        onRetry={() => void query.refetch()}
      />
    );
  }
  return null;
}

function MetricLink({ metric }: { metric: MetricCardData }) {
  return (
    <Link
      className={`organization-dashboard__metric organization-dashboard__metric--${metric.tone}`}
      to={metric.href}
      aria-label={`${metric.title}: ${metric.value}. View details`}
    >
      <span className="organization-dashboard__metric-icon" aria-hidden="true">
        <AppIcon name={metric.icon} size={21} />
      </span>
      <span className="organization-dashboard__metric-copy">
        <span>{metric.title}</span>
        <strong>{metric.value}</strong>
      </span>
      <AppIcon name="chevron" size={17} />
    </Link>
  );
}

function PanelHeader({
  title,
  icon,
  href,
  headingId,
}: {
  title: string;
  icon: AppIconName;
  href: string;
  headingId: string;
}) {
  return (
    <header className="organization-dashboard__panel-header">
      <h2 id={headingId}>
        <AppIcon name={icon} size={19} />
        {title}
      </h2>
      <Link to={href}>
        View details <AppIcon name="chevron" size={15} />
      </Link>
    </header>
  );
}

function RequestOverview({
  kpis,
  query,
  analytics,
  visible,
}: {
  kpis: readonly DashboardKpi[];
  query: UseQueryResult<DashboardAnalyticsData, Error> | undefined;
  analytics: RequestAnalytics | undefined;
  visible: boolean;
}) {
  const total = findKpi(kpis, ['TOTAL_REQUESTS', 'ACCESSIBLE_REQUESTS', 'MY_TOTAL_REQUESTS']);
  const statusMetrics: Array<{
    title: string;
    keys: string[];
    statuses: string[];
    icon: AppIconName;
    tone: MetricTone;
  }> = [
    {
      title: 'Pending Requests',
      keys: ['PENDING_REQUESTS', 'ACCESSIBLE_PENDING_REQUESTS', 'MY_PENDING_REQUESTS'],
      statuses: ['PENDING', 'PENDING_APPROVAL', 'SUBMITTED'],
      icon: 'requests',
      tone: 'warning',
    },
    {
      title: 'Approved Requests',
      keys: ['APPROVED_REQUESTS', 'ACCESSIBLE_APPROVED_REQUESTS', 'MY_APPROVED_REQUESTS'],
      statuses: ['APPROVED'],
      icon: 'approvals',
      tone: 'success',
    },
    {
      title: 'Rejected Requests',
      keys: ['REJECTED_REQUESTS', 'ACCESSIBLE_REJECTED_REQUESTS', 'MY_REJECTED_REQUESTS'],
      statuses: ['REJECTED'],
      icon: 'requests',
      tone: 'error',
    },
    {
      title: 'Returned Requests',
      keys: ['RETURNED_REQUESTS', 'ACCESSIBLE_RETURNED_REQUESTS', 'MY_RETURNED_REQUESTS'],
      statuses: ['RETURNED'],
      icon: 'requests',
      tone: 'information',
    },
  ];
  const metrics = statusMetrics.flatMap((metric) => {
    const value = getRequestCount(kpis, analytics, metric.keys, metric.statuses);
    return value === undefined
      ? []
      : [
          {
            key: metric.title,
            title: metric.title,
            value,
            icon: metric.icon,
            tone: metric.tone,
            href: APP_ROUTES.dashboardRequestSummary,
          },
        ];
  });
  const hasQueryFeedback =
    visible &&
    query !== undefined &&
    (query.isPending || query.isError || query.data?.scope === 'PLATFORM');

  if (!visible && !total && metrics.length === 0) return null;

  return (
    <section
      className={`organization-dashboard__request-area${!total || (metrics.length === 0 && !hasQueryFeedback) ? ' organization-dashboard__request-area--single-column' : ''}`}
      aria-label="Request summary"
    >
      {total && (
        <Link
          className="organization-dashboard__request-total"
          to={APP_ROUTES.dashboardRequestSummary}
          aria-label={`${total.title}: ${formatKpi(total)}. View request summary`}
        >
          <span className="organization-dashboard__request-total-icon" aria-hidden="true">
            <AppIcon name="requests" size={27} />
          </span>
          <span>{total.title}</span>
          <strong>{formatKpi(total)}</strong>
          <AppIcon name="chevron" size={19} />
        </Link>
      )}
      {(metrics.length > 0 || hasQueryFeedback || (visible && !total)) && (
        <div className="organization-dashboard__request-metrics">
          {metrics.map((metric) => (
            <MetricLink key={metric.key} metric={metric} />
          ))}
          {visible && metrics.length === 0 && !total && !query?.isPending && !query?.isError && (
            <p className="organization-dashboard__empty">No request totals are available.</p>
          )}
          {visible && <AnalyticsFeedback query={query} title="Request analytics" />}
        </div>
      )}
    </section>
  );
}

function ApprovalOverview({
  kpis,
  query,
  visible,
}: {
  kpis: readonly DashboardKpi[];
  query: UseQueryResult<DashboardAnalyticsData, Error> | undefined;
  visible: boolean;
}) {
  const specs: Array<{
    title: string;
    keys: string[];
    icon: AppIconName;
    tone: MetricTone;
  }> = [
    {
      title: 'Pending Approval',
      keys: ['PENDING_APPROVAL', 'PENDING_MY_APPROVAL'],
      icon: 'approvals',
      tone: 'warning',
    },
    {
      title: 'Available to Claim',
      keys: ['AVAILABLE_TO_CLAIM'],
      icon: 'users',
      tone: 'information',
    },
    {
      title: 'Approved Decisions',
      keys: ['APPROVED_DECISIONS', 'APPROVED_BY_ME'],
      icon: 'approvals',
      tone: 'success',
    },
    {
      title: 'Rejected Decisions',
      keys: ['REJECTED_DECISIONS', 'REJECTED_BY_ME'],
      icon: 'requests',
      tone: 'error',
    },
    {
      title: 'Returned Decisions',
      keys: ['RETURNED_DECISIONS', 'RETURNED_BY_ME'],
      icon: 'requests',
      tone: 'information',
    },
    {
      title: 'Overdue Approvals',
      keys: ['OVERDUE_APPROVALS'],
      icon: 'approvals',
      tone: 'error',
    },
  ];
  const metrics = specs.flatMap((spec) => {
    const kpi = findKpi(kpis, spec.keys);
    return kpi
      ? [
          {
            key: kpi.key,
            title: kpi.title || spec.title,
            value: formatDashboardKpi(kpi.value, kpi.format, kpi.unit),
            icon: spec.icon,
            tone: spec.tone,
            href: APP_ROUTES.dashboardApprovalSummary,
          },
        ]
      : [];
  });

  if (!visible && metrics.length === 0) return null;

  return (
    <section className="organization-dashboard__approval-area" aria-label="Approval summary">
      <div className="organization-dashboard__approval-metrics">
        {metrics.map((metric) => (
          <MetricLink key={metric.key} metric={metric} />
        ))}
        {visible && metrics.length === 0 && !query?.isPending && !query?.isError && (
          <p className="organization-dashboard__empty">No approval totals are available.</p>
        )}
        {visible && <AnalyticsFeedback query={query} title="Approval analytics" />}
      </div>
    </section>
  );
}

function EmployeesPanel({
  kpis,
  query,
  analytics,
}: {
  kpis: readonly DashboardKpi[];
  query: UseQueryResult<DashboardAnalyticsData, Error> | undefined;
  analytics: UserAnalytics | undefined;
}) {
  const headingId = useId();
  const employeeKpi = findKpi(kpis, ['TOTAL_EMPLOYEES']);
  const total =
    analytics && analytics.scope !== 'PLATFORM'
      ? analytics.userCounts.totalUsers
      : employeeKpi?.value;
  if (total === undefined && !query) return null;

  return (
    <section className="organization-dashboard__panel" aria-labelledby={headingId}>
      <PanelHeader
        title="Employees Overview"
        icon="users"
        href={APP_ROUTES.dashboardUserStatistics}
        headingId={headingId}
      />
      {analytics && analytics.scope !== 'PLATFORM' ? (
        <div className="organization-dashboard__employees">
          <DashboardChart
            title="Employees by status"
            points={[
              { label: 'Active', value: analytics.userCounts.activeUsers },
              { label: 'Inactive', value: analytics.userCounts.inactiveUsers },
            ]}
            type="donut"
            valueLabel="employees"
            compact
          />
          <dl className="organization-dashboard__employee-counts">
            <div>
              <dt>Total Employees</dt>
              <dd>{new Intl.NumberFormat().format(analytics.userCounts.totalUsers)}</dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{new Intl.NumberFormat().format(analytics.userCounts.activeUsers)}</dd>
            </div>
            <div>
              <dt>Inactive</dt>
              <dd>{new Intl.NumberFormat().format(analytics.userCounts.inactiveUsers)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="organization-dashboard__employee-total">
          <strong>{total === undefined ? '—' : new Intl.NumberFormat().format(total)}</strong>
          <span>Total Employees</span>
          <AnalyticsFeedback query={query} title="Employee analytics" />
        </div>
      )}
    </section>
  );
}

function OrganizationStructurePanel({
  kpis,
  query,
  analytics,
}: {
  kpis: readonly DashboardKpi[];
  query: UseQueryResult<DashboardAnalyticsData, Error> | undefined;
  analytics: DepartmentAnalytics | undefined;
}) {
  const headingId = useId();
  const departmentKpi = findKpi(kpis, ['TOTAL_DEPARTMENTS']);
  const roleKpi = findKpi(kpis, ['TOTAL_ROLES']);
  const assignmentKpi = findKpi(kpis, ['ACTIVE_ROLE_ASSIGNMENTS']);
  const directory =
    analytics && 'departmentDirectory' in analytics ? analytics.departmentDirectory : undefined;
  const totalDepartments = departmentKpi?.value ?? directory?.total;
  const visible =
    totalDepartments !== undefined ||
    roleKpi !== undefined ||
    assignmentKpi !== undefined ||
    query !== undefined;
  if (!visible) return null;

  const builtInRoles = findKpi(kpis, ['BUILT_IN_ROLES']);
  const customRoles = findKpi(kpis, ['CUSTOM_ROLES']);
  const metrics: Array<{
    title: string;
    value: string;
    detail?: string;
    icon: AppIconName;
    href: string;
  }> = [];
  if (totalDepartments !== undefined) {
    const detail = directory
      ? `${new Intl.NumberFormat().format(directory.active)} active · ${new Intl.NumberFormat().format(directory.inactive)} inactive`
      : undefined;
    metrics.push({
      title: 'Total Departments',
      value: new Intl.NumberFormat().format(totalDepartments),
      ...(detail ? { detail } : {}),
      icon: 'departments',
      href: APP_ROUTES.dashboardDepartmentOverview,
    });
  }
  if (roleKpi) {
    const roleDetail =
      builtInRoles && customRoles
        ? `${formatDashboardKpi(builtInRoles.value, builtInRoles.format, builtInRoles.unit)} built-in · ${formatDashboardKpi(customRoles.value, customRoles.format, customRoles.unit)} custom`
        : undefined;
    metrics.push({
      title: 'Total Roles',
      value: formatDashboardKpi(roleKpi.value, roleKpi.format, roleKpi.unit),
      ...(roleDetail ? { detail: roleDetail } : {}),
      icon: 'roles',
      href: APP_ROUTES.roles,
    });
  }
  if (assignmentKpi) {
    metrics.push({
      title: assignmentKpi.title,
      value: formatDashboardKpi(assignmentKpi.value, assignmentKpi.format, assignmentKpi.unit),
      icon: 'users',
      href: APP_ROUTES.roles,
    });
  }

  return (
    <section className="organization-dashboard__panel" aria-labelledby={headingId}>
      <PanelHeader
        title="Organization Structure"
        icon="departments"
        href={APP_ROUTES.dashboardDepartmentOverview}
        headingId={headingId}
      />
      <div className="organization-dashboard__structure">
        {metrics.map((metric) => (
          <Link
            className="organization-dashboard__structure-metric"
            key={metric.title}
            to={metric.href}
          >
            <span className="organization-dashboard__structure-icon" aria-hidden="true">
              <AppIcon name={metric.icon} size={21} />
            </span>
            <strong>{metric.value}</strong>
            <span>{metric.title}</span>
            {metric.detail && <small>{metric.detail}</small>}
          </Link>
        ))}
        {metrics.length === 0 && !query?.isPending && !query?.isError && (
          <p className="organization-dashboard__empty">Structure metrics are unavailable.</p>
        )}
      </div>
      <AnalyticsFeedback query={query} title="Department analytics" />
    </section>
  );
}

function QuickInsights({
  kpis,
  userAnalytics,
}: {
  kpis: readonly DashboardKpi[];
  userAnalytics: UserAnalytics | undefined;
}) {
  const requests = findKpi(kpis, ['TOTAL_REQUESTS', 'ACCESSIBLE_REQUESTS', 'MY_TOTAL_REQUESTS']);
  const employees = findKpi(kpis, ['TOTAL_EMPLOYEES']);
  const roleAssignments = findKpi(kpis, ['ACTIVE_ROLE_ASSIGNMENTS']);
  const departments = findKpi(kpis, ['TOTAL_DEPARTMENTS']);
  const cards: Array<{
    title: string;
    value: string;
    detail: string;
    icon: AppIconName;
    href: string;
  }> = [];
  if (requests) {
    cards.push({
      title: requests.title,
      value: formatDashboardKpi(requests.value, requests.format, requests.unit),
      detail: 'Requests in your authorized scope',
      icon: 'requests',
      href: APP_ROUTES.dashboardRequestSummary,
    });
  }
  if (userAnalytics?.scope !== 'PLATFORM' && userAnalytics) {
    cards.push({
      title: 'Total Employees',
      value: new Intl.NumberFormat().format(userAnalytics.userCounts.totalUsers),
      detail: 'Across your organization',
      icon: 'users',
      href: APP_ROUTES.dashboardUserStatistics,
    });
  } else if (employees) {
    cards.push({
      title: employees.title,
      value: formatDashboardKpi(employees.value, employees.format, employees.unit),
      detail: 'Across your organization',
      icon: 'users',
      href: APP_ROUTES.dashboardUserStatistics,
    });
  }
  if (roleAssignments) {
    cards.push({
      title: roleAssignments.title,
      value: formatDashboardKpi(
        roleAssignments.value,
        roleAssignments.format,
        roleAssignments.unit,
      ),
      detail: 'Across all available roles',
      icon: 'roles',
      href: APP_ROUTES.roles,
    });
  } else if (departments) {
    cards.push({
      title: departments.title,
      value: formatDashboardKpi(departments.value, departments.format, departments.unit),
      detail: 'In your authorized scope',
      icon: 'departments',
      href: APP_ROUTES.dashboardDepartmentOverview,
    });
  }

  if (cards.length < 2) return null;

  return (
    <section className="organization-dashboard__insights">
      <h2>
        <AppIcon name="dashboard" size={19} />
        Quick Insights
      </h2>
      <div className="organization-dashboard__insight-grid">
        {cards.map((card) => (
          <Link className="organization-dashboard__insight" key={card.title} to={card.href}>
            <span className="organization-dashboard__insight-icon" aria-hidden="true">
              <AppIcon name={card.icon} size={23} />
            </span>
            <span>
              <strong>{card.value}</strong>
              <span>{card.title}</span>
              <small>{card.detail}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function OrganizationDashboardOverview({
  kpis,
  analytics,
  widgets,
}: {
  kpis: readonly DashboardKpi[];
  analytics: AnalyticsQueries;
  widgets: readonly DashboardWidget[];
}) {
  const requestQuery = analytics.get('REQUESTS');
  const approvalQuery = analytics.get('APPROVALS');
  const userQuery = analytics.get('USERS');
  const departmentQuery = analytics.get('DEPARTMENTS');
  const requestAnalytics = getRequestAnalytics(requestQuery?.data);
  const userAnalytics = getUserAnalytics(userQuery?.data);
  const departmentAnalytics = getDepartmentAnalytics(departmentQuery?.data);
  const hasRequests = hasWidget(widgets, 'REQUEST_SUMMARY');
  const hasApprovals =
    hasWidget(widgets, 'APPROVAL_SUMMARY') || hasWidget(widgets, 'APPROVAL_ACTIVITY');
  const employeesVisible =
    hasWidget(widgets, 'USER_STATISTICS') || findKpi(kpis, ['TOTAL_EMPLOYEES']) !== undefined;
  const departmentsVisible =
    hasWidget(widgets, 'DEPARTMENT_OVERVIEW') ||
    hasWidget(widgets, 'ROLE_OVERVIEW') ||
    findKpi(kpis, ['TOTAL_DEPARTMENTS', 'TOTAL_ROLES', 'ACTIVE_ROLE_ASSIGNMENTS']) !== undefined;

  return (
    <div className="organization-dashboard">
      <RequestOverview
        kpis={kpis}
        query={requestQuery}
        analytics={requestAnalytics}
        visible={hasRequests}
      />
      <ApprovalOverview kpis={kpis} query={approvalQuery} visible={hasApprovals} />
      <div className="organization-dashboard__overview-grid">
        {employeesVisible && (
          <EmployeesPanel kpis={kpis} query={userQuery} analytics={userAnalytics} />
        )}
        {departmentsVisible && (
          <OrganizationStructurePanel
            kpis={kpis}
            query={departmentQuery}
            analytics={departmentAnalytics}
          />
        )}
      </div>
      <QuickInsights kpis={kpis} userAnalytics={userAnalytics} />
    </div>
  );
}
