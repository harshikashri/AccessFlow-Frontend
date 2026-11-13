import { useState } from 'react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { DashboardEmptyState } from '@/features/dashboard/components/DashboardEmptyState';
import { AnalyticsWidget } from '@/features/dashboard/components/AnalyticsWidget';
import { DashboardErrorState } from '@/features/dashboard/components/DashboardErrorState';
import { DashboardFilters } from '@/features/dashboard/components/DashboardFilters';
import { DashboardGrid } from '@/features/dashboard/components/DashboardGrid';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { isPlatformSession } from '@/features/authorization/navigation';
import { dashboardQueryKeys } from '@/features/dashboard/hooks/dashboard-query-keys';
import {
  useDashboardConfiguration,
  useDashboardContent,
} from '@/features/dashboard/hooks/useDashboardQueries';
import type {
  DashboardConfiguration,
  DashboardDateRangeFilter,
  DashboardKpi,
  DashboardWidget,
} from '@/features/dashboard/types/dashboard.types';
import {
  formatDashboardKpi,
  getAuthorizedDashboardWidgets,
  getDashboardKpis,
  isDashboardAnalyticsProvider,
  isValidDashboardDateFilter,
} from '@/features/dashboard/utils/dashboard.utils';

function getDefaultFilter(configuration: DashboardConfiguration): DashboardDateRangeFilter {
  const availableRanges = configuration.availableFilters.dateRange;
  const range = availableRanges.includes('LAST_30_DAYS')
    ? 'LAST_30_DAYS'
    : (availableRanges[0] ?? 'LAST_30_DAYS');
  return { range };
}

function isConfigurationForUser(
  configuration: DashboardConfiguration,
  userId: string,
  organizationId: string | null,
  platformSession: boolean,
): boolean {
  return (
    configuration.userContext.userId === userId &&
    configuration.userContext.organizationId === organizationId &&
    (configuration.dashboardType === 'PLATFORM') === platformSession
  );
}

function getKpiIcon(
  key: string,
): 'organizations' | 'users' | 'departments' | 'roles' | 'requests' | 'approvals' | 'dashboard' {
  if (key.includes('ORGANIZATION')) return 'organizations';
  if (key.includes('DEPARTMENT')) return 'departments';
  if (key.includes('USER') || key.includes('EMPLOYEE') || key.includes('MEMBERSHIP'))
    return 'users';
  if (key.includes('ROLE')) return 'roles';
  if (key.includes('APPROVAL') || key.includes('DECISION')) return 'approvals';
  if (key.includes('REQUEST')) return 'requests';
  return 'dashboard';
}

function renderKpi(kpi: DashboardKpi) {
  return (
    <KpiCard
      key={kpi.key}
      title={kpi.title}
      value={formatDashboardKpi(kpi.value, kpi.format, kpi.unit)}
      icon={getKpiIcon(kpi.key)}
    />
  );
}

function hasAnalyticsWidget(widgets: readonly DashboardWidget[]): boolean {
  return widgets.some(
    (widget) =>
      widget.analyticsStatus === 'IMPLEMENTED' &&
      widget.analyticsProvider !== undefined &&
      widget.analyticsProvider !== null &&
      widget.analyticsProvider.length > 0,
  );
}

function DashboardWorkspace({
  user,
  configuration,
}: {
  user: AuthenticatedUser;
  configuration: DashboardConfiguration;
}) {
  const queryClient = useQueryClient();
  const defaultFilter = getDefaultFilter(configuration);
  const [filter, setFilter] = useState<DashboardDateRangeFilter>(defaultFilter);
  const [activityPage, setActivityPage] = useState(1);
  const widgets = getAuthorizedDashboardWidgets(configuration, user);
  const { summary, analytics } = useDashboardContent(user, configuration, filter, activityPage);
  const isRefreshing = useIsFetching({ queryKey: dashboardQueryKeys.user(user.id) }) > 0;
  const hasCustomRange = configuration.availableFilters.dateRange.includes('CUSTOM');
  const validFilter = isValidDashboardDateFilter(
    filter,
    configuration.dateRangeOptions.maxCustomRangeDays,
  );
  const kpis =
    summary.data && summary.data.dashboardType === configuration.dashboardType
      ? getDashboardKpis(summary.data.kpis, widgets)
      : [];
  const dataWidgets = widgets.filter(
    (widget) =>
      widget.analyticsStatus === 'IMPLEMENTED' &&
      widget.analyticsProvider !== undefined &&
      widget.analyticsProvider !== null &&
      widget.analyticsProvider.length > 0,
  );
  const summaryMismatch =
    summary.data !== undefined && summary.data.dashboardType !== configuration.dashboardType;

  function applyFilter(nextFilter: DashboardDateRangeFilter) {
    setFilter(nextFilter);
    setActivityPage(1);
  }

  async function refreshDashboard() {
    await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.user(user.id) });
  }

  if (configuration.widgets.length === 0 || widgets.length === 0) {
    return (
      <div className="workspace-page">
        <DashboardHeader
          type={configuration.dashboardType}
          userName={user.name}
          refreshing={isRefreshing}
          onRefresh={() => void refreshDashboard()}
        />
        <DashboardEmptyState />
      </div>
    );
  }

  if (summaryMismatch) {
    return (
      <div className="workspace-page dashboard-page">
        <DashboardHeader
          type={configuration.dashboardType}
          userName={user.name}
          refreshing={isRefreshing}
          onRefresh={() => void refreshDashboard()}
        />
        <DashboardErrorState
          message="The dashboard data does not match the current access context."
          onRetry={() => void refreshDashboard()}
        />
      </div>
    );
  }

  return (
    <div className="workspace-page dashboard-page">
      <DashboardHeader
        type={configuration.dashboardType}
        userName={user.name}
        refreshing={isRefreshing}
        onRefresh={() => void refreshDashboard()}
      />
      {configuration.availableFilters.dateRange.length > 0 && (
        <DashboardFilters
          availableRanges={configuration.availableFilters.dateRange}
          maxCustomRangeDays={configuration.dateRangeOptions.maxCustomRangeDays}
          value={filter}
          onApply={applyFilter}
          onReset={() => applyFilter(defaultFilter)}
        />
      )}
      {!validFilter && (
        <p className="dashboard-filters__error" role="alert">
          The selected date range is invalid. Choose another range before loading dashboard data.
        </p>
      )}
      {summary.isPending && <DashboardSkeleton />}
      {summary.isError && (
        <DashboardErrorState
          message={getAuthErrorMessage(summary.error, 'Dashboard statistics could not be loaded.')}
          onRetry={() => void summary.refetch()}
        />
      )}
      {summary.data && summary.data.dashboardType !== configuration.dashboardType && (
        <DashboardErrorState
          message="The dashboard configuration changed. Refresh to load data for the current access context."
          onRetry={() => void refreshDashboard()}
        />
      )}
      {!summary.isPending && !summary.isError && kpis.length > 0 && (
        <DashboardGrid variant="kpis">{kpis.map(renderKpi)}</DashboardGrid>
      )}
      {!summary.isPending &&
        !summary.isError &&
        kpis.length === 0 &&
        !hasAnalyticsWidget(widgets) && (
          <DashboardEmptyState
            title="No dashboard statistics are available"
            description="The configured widgets do not currently provide data for this session."
          />
        )}
      {summary.data?.deferredWidgets.length ? (
        <p className="dashboard-page__deferred">
          Some configured dashboard data is not available yet:{' '}
          {summary.data.deferredWidgets.map((widget) => widget.title).join(', ')}.
        </p>
      ) : null}
      {dataWidgets.length > 0 && (
        <DashboardGrid>
          {dataWidgets.map((widget) => (
            <AnalyticsWidget
              key={widget.key}
              widget={widget}
              query={
                typeof widget.analyticsProvider === 'string' &&
                isDashboardAnalyticsProvider(widget.analyticsProvider)
                  ? analytics.get(widget.analyticsProvider)
                  : undefined
              }
              activityPage={activityPage}
              onActivityPageChange={setActivityPage}
            />
          ))}
        </DashboardGrid>
      )}
      <QuickActions user={user} />
      {hasCustomRange && (
        <p className="dashboard-page__timezone">
          Date ranges use {configuration.dateRangeOptions.timeZone} and the{' '}
          {configuration.dateRangeOptions.interval} interval.
        </p>
      )}
    </div>
  );
}

function DashboardConfigurationPage({ user }: { user: AuthenticatedUser }) {
  const configurationQuery = useDashboardConfiguration(user);
  if (configurationQuery.isPending) return <DashboardSkeleton />;
  if (configurationQuery.isError) {
    return (
      <DashboardErrorState
        message={getAuthErrorMessage(
          configurationQuery.error,
          'Dashboard configuration could not be loaded.',
        )}
        onRetry={() => void configurationQuery.refetch()}
      />
    );
  }

  const configuration = configurationQuery.data;
  if (
    !isConfigurationForUser(configuration, user.id, user.organizationId, isPlatformSession(user))
  ) {
    return (
      <DashboardErrorState
        message="The dashboard configuration does not match the current access context."
        onRetry={() => void configurationQuery.refetch()}
      />
    );
  }

  return <DashboardWorkspace key={user.id} user={user} configuration={configuration} />;
}

export function DashboardPage() {
  const { authorizationStatus, user } = useAuth();

  if (!user || authorizationStatus !== 'available') {
    return (
      <DashboardEmptyState
        title="Dashboard access is unavailable"
        description="Refresh your session before viewing dashboard data."
      />
    );
  }

  return <DashboardConfigurationPage user={user} />;
}
