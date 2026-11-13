import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { DashboardChart } from '@/features/dashboard/components/DashboardChart';
import { DashboardErrorState } from '@/features/dashboard/components/DashboardErrorState';
import { RecentActivity } from '@/features/dashboard/components/RecentActivity';
import type {
  ActivityAnalytics,
  ApprovalAnalytics,
  DashboardAnalyticsData,
  DashboardWidget,
  DepartmentAnalytics,
  OrganizationAnalytics,
  RequestAnalytics,
  UserAnalytics,
} from '@/features/dashboard/types/dashboard.types';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import type { UseQueryResult } from '@tanstack/react-query';

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function statusVariant(
  status: string,
): 'default' | 'success' | 'warning' | 'error' | 'information' {
  const normalized = status.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'COMPLETED'].includes(normalized)) return 'success';
  if (['PENDING', 'PENDING_APPROVAL', 'SUBMITTED', 'RETURNED'].includes(normalized)) {
    return 'warning';
  }
  if (['INACTIVE', 'REJECTED', 'CANCELLED'].includes(normalized)) return 'error';
  return 'default';
}

function MetricList({ items }: { items: Array<{ label: string; value: number | string | null }> }) {
  return (
    <dl className="dashboard-metrics">
      {items.map((item) => (
        <div className="dashboard-metric" key={item.label}>
          <dt>{item.label}</dt>
          <dd>
            {item.value === null
              ? 'Not available'
              : typeof item.value === 'number'
                ? formatNumber(item.value)
                : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RequestAnalyticsView({ data }: { data: RequestAnalytics }) {
  const period = data.requestVolumeComparison;
  const delta = period.currentPeriodCount - period.previousPeriodCount;
  const requestTypePoints = data.requestTypes.map((row) => ({
    label: row.requestType,
    value: row.total,
  }));
  return (
    <>
      <div className="dashboard-comparison">
        <MetricList
          items={[
            { label: 'Current period', value: period.currentPeriodCount },
            { label: 'Previous period', value: period.previousPeriodCount },
            {
              label: 'Change',
              value: `${delta > 0 ? '+' : ''}${formatNumber(delta)}`,
            },
            {
              label: 'Change (%)',
              value:
                period.percentageChange === null
                  ? null
                  : `${formatNumber(period.percentageChange)}%`,
            },
          ]}
        />
      </div>
      <div className="dashboard-chart-grid">
        <DashboardChart
          title="Request trends"
          points={data.requestTrends.map((row) => ({
            label: row.period,
            value: row.count,
          }))}
          type="line"
        />
        <DashboardChart
          title="Requests by status"
          points={data.statusDistribution.map((row) => ({
            label: row.status,
            value: row.count,
          }))}
          type="donut"
        />
        <DashboardChart title="Requests by type" points={requestTypePoints} />
      </div>
    </>
  );
}

function ApprovalSummaryView({ data }: { data: ApprovalAnalytics }) {
  return (
    <>
      <DashboardChart
        title="Approval status"
        points={data.approvalStatusDistribution.map((row) => ({
          label: row.status,
          value: row.count,
        }))}
        type="donut"
      />
      <MetricList
        items={[
          { label: 'Pending approval stages', value: data.workload.pendingApprovalStages },
          { label: 'Available to claim', value: data.workload.availableToClaimStages },
          { label: 'Currently overdue', value: data.workload.currentlyOverdueStages },
          { label: 'Completed decisions', value: data.performance.completedDecisions },
          {
            label: 'Average decision time (minutes)',
            value: data.performance.averageDecisionMinutes,
          },
          {
            label: 'Median decision time (minutes)',
            value: data.performance.medianDecisionMinutes,
          },
          { label: 'SLA sample size', value: data.performance.slaDecisionSampleSize },
          { label: 'On-time decisions', value: data.performance.onTimeDecisions },
          { label: 'Overdue decisions', value: data.performance.overdueDecisions },
          {
            label: 'SLA compliance',
            value:
              data.performance.slaCompliancePercentage === null
                ? null
                : `${formatNumber(data.performance.slaCompliancePercentage)}%`,
          },
        ]}
      />
    </>
  );
}

function ApprovalActivityView({ data }: { data: ApprovalAnalytics }) {
  return (
    <div className="dashboard-chart-grid">
      <DashboardChart
        title="Recorded approval decisions"
        points={data.decisions.map((row) => ({ label: row.decision, value: row.count }))}
        type="donut"
      />
      <DashboardChart
        title="Approval stages by total steps"
        points={data.stages.map((row) => ({ label: row.stageName, value: row.totalSteps }))}
      />
    </div>
  );
}

function UserAnalyticsView({ data }: { data: UserAnalytics }) {
  if (data.scope === 'PLATFORM') {
    return (
      <>
        <MetricList
          items={[
            { label: 'Unique users', value: data.userCounts.totalUniqueUsers },
            { label: 'Active unique users', value: data.userCounts.activeUniqueUsers },
            { label: 'Inactive unique users', value: data.userCounts.inactiveUniqueUsers },
          ]}
        />
        <div className="dashboard-chart-grid">
          <DashboardChart
            title="User registrations"
            points={data.registrationTrends.map((row) => ({
              label: row.period,
              value: row.count,
            }))}
            type="line"
          />
          <DashboardChart
            title="Memberships by organization"
            points={data.byOrganization.map((row) => ({
              label: row.organizationName,
              value: row.totalMemberships,
            }))}
          />
          <DashboardChart
            title="Users by role category"
            points={data.byRoleCategory.map((row) => ({
              label: row.roleCategory,
              value: row.uniqueUsers,
            }))}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <MetricList
        items={[
          { label: 'Users in scope', value: data.userCounts.totalUsers },
          { label: 'Active users', value: data.userCounts.activeUsers },
          { label: 'Inactive users', value: data.userCounts.inactiveUsers },
        ]}
      />
      <div className="dashboard-chart-grid">
        <DashboardChart
          title="User registrations"
          points={data.registrationTrends.map((row) => ({
            label: row.period,
            value: row.count,
          }))}
          type="line"
        />
        <DashboardChart
          title="Users by department"
          points={data.byDepartment.map((row) => ({
            label: row.departmentName,
            value: row.totalUsers,
          }))}
        />
      </div>
    </>
  );
}

function OrganizationAnalyticsView({ data }: { data: OrganizationAnalytics }) {
  return (
    <>
      <MetricList
        items={[
          {
            label: 'Organizations this period',
            value: data.organizationComparison.currentPeriodCount,
          },
          {
            label: 'Organizations previous period',
            value: data.organizationComparison.previousPeriodCount,
          },
          {
            label: 'Change (%)',
            value:
              data.organizationComparison.percentageChange === null
                ? null
                : `${formatNumber(data.organizationComparison.percentageChange)}%`,
          },
        ]}
      />
      <div className="dashboard-chart-grid">
        <DashboardChart
          title="Organization registrations"
          points={data.registrationTrends.map((row) => ({
            label: row.period,
            value: row.count,
          }))}
          type="line"
        />
        <DashboardChart
          title="Organization status"
          points={data.statusDistribution.map((row) => ({
            label: row.status,
            value: row.count,
          }))}
          type="donut"
        />
      </div>
      <Table aria-label="Organization overview">
        <TableHead>
          <TableRow>
            <TableHeader>Organization</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Users</TableHeader>
            <TableHeader>Departments</TableHeader>
            <TableHeader>Requests</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.organizations.length === 0 ? (
            <TableEmptyState colSpan={5}>No organizations are available.</TableEmptyState>
          ) : (
            data.organizations.slice(0, 10).map((organization) => (
              <TableRow key={organization.organizationId}>
                <TableCell>{organization.organizationName}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(organization.status)}>{organization.status}</Badge>
                </TableCell>
                <TableCell>{formatNumber(organization.totalMemberships)}</TableCell>
                <TableCell>{formatNumber(organization.totalDepartments)}</TableCell>
                <TableCell>{formatNumber(organization.periodRequests)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data.organizations.length > 10 && (
        <p className="dashboard-widget__note">
          Showing 10 of {formatNumber(data.organizations.length)} organizations returned by the
          analytics endpoint.
        </p>
      )}
    </>
  );
}

function DepartmentAnalyticsView({ data }: { data: DepartmentAnalytics }) {
  if (data.scope === 'PLATFORM') {
    return (
      <div className="dashboard-chart-grid">
        <MetricList items={[{ label: 'Total departments', value: data.totalDepartments }]} />
        <DashboardChart
          title="Department status"
          points={data.statusDistribution.map((row) => ({
            label: row.status,
            value: row.count,
          }))}
          type="donut"
        />
        <DashboardChart
          title="Department growth"
          points={data.departmentGrowth.map((row) => ({
            label: row.period,
            value: row.count,
          }))}
          type="line"
        />
        <DashboardChart
          title="Departments by organization"
          points={data.byOrganization.map((row) => ({
            label: row.organizationName,
            value: row.totalDepartments,
          }))}
        />
      </div>
    );
  }

  if (data.departmentDirectory) {
    const directory = data.departmentDirectory;
    return (
      <>
        <MetricList
          items={[
            { label: 'Departments in scope', value: directory.total },
            { label: 'Active departments', value: directory.active },
            { label: 'Inactive departments', value: directory.inactive },
          ]}
        />
        <Table aria-label="Department overview">
          <TableHead>
            <TableRow>
              <TableHeader>Department</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {directory.departments.length === 0 ? (
              <TableEmptyState colSpan={2}>No departments are available.</TableEmptyState>
            ) : (
              directory.departments.map((department) => (
                <TableRow key={department.departmentId}>
                  <TableCell>{department.departmentName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(department.status)}>{department.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </>
    );
  }

  const departments = data.departments ?? [];
  if (departments.some((department) => 'totalRequests' in department)) {
    return (
      <DashboardChart
        title="Requests by department"
        points={departments.flatMap((department) =>
          'totalRequests' in department
            ? [{ label: department.departmentName, value: department.totalRequests }]
            : [],
        )}
      />
    );
  }
  return (
    <DashboardChart
      title="Approval workload by department"
      points={departments.flatMap((department) =>
        'assignedApprovalStages' in department
          ? [{ label: department.departmentName, value: department.assignedApprovalStages }]
          : [],
      )}
    />
  );
}

function RequestOrganizationsView({ data }: { data: RequestAnalytics }) {
  if (!data.requestsByOrganization) return null;
  return (
    <DashboardChart
      title="Requests by organization"
      points={data.requestsByOrganization.map((row) => ({
        label: row.organizationName,
        value: row.totalRequests,
      }))}
    />
  );
}

function isRequestAnalytics(data: DashboardAnalyticsData): data is RequestAnalytics {
  return 'requestTrends' in data;
}

function isApprovalAnalytics(data: DashboardAnalyticsData): data is ApprovalAnalytics {
  return 'workload' in data;
}

function isUserAnalytics(data: DashboardAnalyticsData): data is UserAnalytics {
  return 'userCounts' in data;
}

function isDepartmentAnalytics(data: DashboardAnalyticsData): data is DepartmentAnalytics {
  return (
    (data.scope === 'PLATFORM' && 'departmentGrowth' in data) ||
    (data.scope !== 'PLATFORM' && ('departmentDirectory' in data || 'departments' in data))
  );
}

function isOrganizationAnalytics(data: DashboardAnalyticsData): data is OrganizationAnalytics {
  return 'organizations' in data && 'organizationComparison' in data;
}

function isActivityAnalytics(data: DashboardAnalyticsData): data is ActivityAnalytics {
  return 'items' in data && 'pagination' in data;
}

function AnalyticsContent({
  widget,
  data,
  activityPage,
  onActivityPageChange,
}: {
  widget: DashboardWidget;
  data: DashboardAnalyticsData;
  activityPage: number;
  onActivityPageChange: (page: number) => void;
}) {
  if (widget.key === 'REQUEST_SUMMARY' && isRequestAnalytics(data)) {
    return <RequestAnalyticsView data={data} />;
  }
  if (widget.key === 'PLATFORM_USAGE_ANALYTICS' && isRequestAnalytics(data)) {
    return (
      <>
        <RequestAnalyticsView data={data} />
        <RequestOrganizationsView data={data} />
      </>
    );
  }
  if (widget.key === 'APPROVAL_SUMMARY' && isApprovalAnalytics(data)) {
    return <ApprovalSummaryView data={data} />;
  }
  if (widget.key === 'APPROVAL_ACTIVITY' && isApprovalAnalytics(data)) {
    return <ApprovalActivityView data={data} />;
  }
  if (
    (widget.key === 'USER_STATISTICS' || widget.key === 'USER_ANALYTICS') &&
    isUserAnalytics(data)
  ) {
    return <UserAnalyticsView data={data} />;
  }
  if (
    (widget.key === 'DEPARTMENT_OVERVIEW' || widget.key === 'DEPARTMENT_ANALYTICS') &&
    isDepartmentAnalytics(data)
  ) {
    return <DepartmentAnalyticsView data={data} />;
  }
  if (widget.key === 'ORGANIZATION_ANALYTICS' && isOrganizationAnalytics(data)) {
    return <OrganizationAnalyticsView data={data} />;
  }
  if (
    (widget.key === 'AUDIT_ACTIVITY' || widget.key === 'PLATFORM_ACTIVITY') &&
    isActivityAnalytics(data)
  ) {
    return (
      <RecentActivity
        title={widget.title}
        data={data}
        page={activityPage}
        onPageChange={onActivityPageChange}
      />
    );
  }
  return (
    <Card title={widget.title} className="dashboard-widget">
      <p className="dashboard-widget__note">
        The configured dashboard data is not supported by this frontend version.
      </p>
    </Card>
  );
}

export function AnalyticsWidget({
  widget,
  query,
  activityPage,
  onActivityPageChange,
}: {
  widget: DashboardWidget;
  query: UseQueryResult<DashboardAnalyticsData, Error> | undefined;
  activityPage: number;
  onActivityPageChange: (page: number) => void;
}) {
  if (widget.analyticsStatus !== 'IMPLEMENTED' || !widget.analyticsProvider) return null;

  if (!query) {
    return (
      <Card title={widget.title} className="dashboard-widget">
        <p className="dashboard-widget__note">
          This configured data source is not supported by this frontend version.
        </p>
      </Card>
    );
  }

  if (query.isPending) {
    return (
      <Card title={widget.title} className="dashboard-widget">
        <div className="dashboard-widget__loading" aria-label={`Loading ${widget.title}`}>
          <span className="ui-skeleton ui-skeleton--line" />
          <span className="ui-skeleton ui-skeleton--rect" />
        </div>
      </Card>
    );
  }

  if (query.isError) {
    return (
      <Card title={widget.title} className="dashboard-widget">
        <DashboardErrorState
          message={getAuthErrorMessage(query.error, 'This dashboard data could not be loaded.')}
          onRetry={() => void query.refetch()}
        />
      </Card>
    );
  }

  if ((widget.scope === 'PLATFORM') !== (query.data.scope === 'PLATFORM')) {
    return (
      <Card title={widget.title} className="dashboard-widget">
        <DashboardErrorState
          message="The dashboard API returned data for a different scope."
          onRetry={() => void query.refetch()}
        />
      </Card>
    );
  }

  const content = (
    <AnalyticsContent
      widget={widget}
      data={query.data}
      activityPage={activityPage}
      onActivityPageChange={onActivityPageChange}
    />
  );
  if (widget.key === 'AUDIT_ACTIVITY' || widget.key === 'PLATFORM_ACTIVITY') return content;
  return (
    <Card title={widget.title} className="dashboard-widget dashboard-widget--wide">
      {content}
    </Card>
  );
}
