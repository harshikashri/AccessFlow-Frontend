import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type {
  ActivityAnalytics,
  ApprovalAnalytics,
  DashboardAnalyticsData,
  DashboardAnalyticsProvider,
  DashboardConfiguration,
  DashboardDateRangeFilter,
  DashboardDateRangeInfo,
  DashboardKpi,
  DashboardScope,
  DashboardSummary,
  DashboardWidget,
  DepartmentAnalytics,
  OrganizationAnalytics,
  RequestAnalytics,
  UserAnalytics,
} from '@/features/dashboard/types/dashboard.types';

const dateRanges = new Set([
  'LAST_7_DAYS',
  'LAST_30_DAYS',
  'LAST_90_DAYS',
  'THIS_MONTH',
  'THIS_YEAR',
  'CUSTOM',
]);
const dashboardScopes = new Set<DashboardScope>([
  'PLATFORM',
  'ORGANIZATION',
  'DEPARTMENT',
  'AUTHORIZED_REQUEST_HISTORY',
  'AUTHORIZED_APPROVAL_ASSIGNMENTS',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDashboardDateRangeInfo(value: unknown): value is DashboardDateRangeInfo {
  return (
    isRecord(value) &&
    typeof value.range === 'string' &&
    dateRanges.has(value.range) &&
    typeof value.fromDate === 'string' &&
    typeof value.toDate === 'string' &&
    typeof value.timeZone === 'string' &&
    typeof value.interval === 'string'
  );
}

function isWidget(value: unknown): value is DashboardWidget {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.category === 'string' &&
    typeof value.scope === 'string' &&
    dashboardScopes.has(value.scope as DashboardScope) &&
    isStringArray(value.supportedFilters) &&
    (value.kpiProvider === undefined ||
      value.kpiProvider === null ||
      typeof value.kpiProvider === 'string') &&
    (value.analyticsProvider === undefined ||
      value.analyticsProvider === null ||
      typeof value.analyticsProvider === 'string') &&
    (value.kpiStatus === 'IMPLEMENTED' || value.kpiStatus === 'DEFERRED') &&
    (value.analyticsStatus === 'IMPLEMENTED' || value.analyticsStatus === 'DEFERRED')
  );
}

function isDashboardConfiguration(value: unknown): value is DashboardConfiguration {
  if (
    !isRecord(value) ||
    (value.dashboardType !== 'DYNAMIC' && value.dashboardType !== 'PLATFORM') ||
    !isRecord(value.userContext) ||
    typeof value.userContext.userId !== 'string' ||
    !(
      value.userContext.organizationId === null ||
      typeof value.userContext.organizationId === 'string'
    ) ||
    !Array.isArray(value.widgets) ||
    !value.widgets.every(isWidget) ||
    !isRecord(value.availableFilters) ||
    !Array.isArray(value.availableFilters.dateRange) ||
    !value.availableFilters.dateRange.every(
      (range) => typeof range === 'string' && dateRanges.has(range),
    ) ||
    !isRecord(value.dateRangeOptions) ||
    typeof value.dateRangeOptions.timeZone !== 'string' ||
    typeof value.dateRangeOptions.interval !== 'string' ||
    typeof value.dateRangeOptions.maxCustomRangeDays !== 'number'
  ) {
    return false;
  }
  return true;
}

function isDashboardKpi(value: unknown): value is DashboardKpi {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    typeof value.title === 'string' &&
    typeof value.value === 'number' &&
    Number.isFinite(value.value) &&
    (value.format === 'NUMBER' || value.format === 'AMOUNT') &&
    value.trend === null &&
    (value.unit === undefined || typeof value.unit === 'string')
  );
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  return (
    isRecord(value) &&
    (value.dashboardType === 'DYNAMIC' || value.dashboardType === 'PLATFORM') &&
    isDashboardDateRangeInfo(value.dateRange) &&
    Array.isArray(value.widgets) &&
    value.widgets.every(isWidget) &&
    Array.isArray(value.deferredWidgets) &&
    value.deferredWidgets.every(
      (widget) =>
        isRecord(widget) && typeof widget.key === 'string' && typeof widget.title === 'string',
    ) &&
    Array.isArray(value.kpis) &&
    value.kpis.every(isDashboardKpi)
  );
}

function hasRows(value: Record<string, unknown>, key: string): boolean {
  return Array.isArray(value[key]) && value[key].every(isRecord);
}

function hasPagination(value: unknown): boolean {
  return (
    isRecord(value) &&
    Number.isInteger(value.page) &&
    Number.isInteger(value.limit) &&
    Number.isInteger(value.total) &&
    Number.isInteger(value.totalPages)
  );
}

function isDashboardAnalyticsData(
  provider: DashboardAnalyticsProvider,
  value: unknown,
): value is DashboardAnalyticsData {
  if (!isRecord(value) || !isDashboardDateRangeInfo(value.dateRange)) return false;

  if (provider === 'ORGANIZATIONS') {
    return (
      value.scope === 'PLATFORM' &&
      hasRows(value, 'registrationTrends') &&
      hasRows(value, 'statusDistribution') &&
      hasRows(value, 'organizations') &&
      isRecord(value.organizationComparison)
    );
  }
  if (provider === 'USERS') {
    if (value.scope === 'PLATFORM') {
      return (
        isRecord(value.userCounts) &&
        hasRows(value, 'registrationTrends') &&
        hasRows(value, 'byOrganization') &&
        hasRows(value, 'byRoleCategory')
      );
    }
    return (
      (value.scope === 'ORGANIZATION' || value.scope === 'DEPARTMENT') &&
      isRecord(value.userCounts) &&
      hasRows(value, 'registrationTrends') &&
      hasRows(value, 'byDepartment')
    );
  }
  if (provider === 'REQUESTS') {
    return (
      typeof value.scope === 'string' &&
      dashboardScopes.has(value.scope as DashboardScope) &&
      hasRows(value, 'requestTrends') &&
      hasRows(value, 'statusDistribution') &&
      hasRows(value, 'requestTypes') &&
      isRecord(value.requestVolumeComparison) &&
      (value.requestsByOrganization === undefined || hasRows(value, 'requestsByOrganization'))
    );
  }
  if (provider === 'APPROVALS') {
    return (
      value.scope === 'AUTHORIZED_APPROVAL_ASSIGNMENTS' &&
      hasRows(value, 'approvalStatusDistribution') &&
      hasRows(value, 'decisions') &&
      hasRows(value, 'stages') &&
      isRecord(value.workload) &&
      isRecord(value.performance)
    );
  }
  if (provider === 'DEPARTMENTS') {
    if (value.scope === 'PLATFORM') {
      return (
        typeof value.totalDepartments === 'number' &&
        hasRows(value, 'statusDistribution') &&
        hasRows(value, 'byOrganization') &&
        hasRows(value, 'departmentGrowth')
      );
    }
    return (
      typeof value.scope === 'string' &&
      dashboardScopes.has(value.scope as DashboardScope) &&
      (value.departmentDirectory === undefined ||
        (isRecord(value.departmentDirectory) &&
          Array.isArray(value.departmentDirectory.departments))) &&
      (value.departments === undefined || hasRows(value, 'departments'))
    );
  }
  return (
    Array.isArray(value.items) && value.items.every(isRecord) && hasPagination(value.pagination)
  );
}

function getApiData(response: AxiosResponse<unknown>): unknown {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The dashboard API returned an unsupported response.');
  }
  return response.data.data;
}

function assertApiData<T>(
  response: AxiosResponse<unknown>,
  isExpected: (value: unknown) => value is T,
): T {
  const data = getApiData(response);
  if (!isExpected(data)) {
    throw new Error('The dashboard API returned an unsupported response.');
  }
  return data;
}

function getDateParams(filter: DashboardDateRangeFilter): Record<string, string> {
  if (filter.range !== 'CUSTOM') return { range: filter.range };
  if (!filter.fromDate || !filter.toDate) {
    throw new Error('Choose both dates for a custom dashboard range.');
  }
  return {
    range: filter.range,
    fromDate: filter.fromDate,
    toDate: filter.toDate,
  };
}

const analyticsPaths: Record<DashboardAnalyticsProvider, string> = {
  ORGANIZATIONS: '/dashboard/organization-analytics',
  USERS: '/dashboard/user-analytics',
  REQUESTS: '/dashboard/request-analytics',
  APPROVALS: '/dashboard/approval-analytics',
  DEPARTMENTS: '/dashboard/department-analytics',
  ACTIVITY: '/dashboard/recent-activity',
};

export const dashboardService = {
  async getConfiguration(): Promise<DashboardConfiguration> {
    const response = await apiClient.get<unknown>('/dashboard/config');
    return assertApiData(response, isDashboardConfiguration);
  },

  async getSummary(filter: DashboardDateRangeFilter): Promise<DashboardSummary> {
    const response = await apiClient.get<unknown>('/dashboard/summary', {
      params: getDateParams(filter),
    });
    return assertApiData(response, isDashboardSummary);
  },

  async getAnalytics(
    provider: DashboardAnalyticsProvider,
    filter: DashboardDateRangeFilter,
    page = 1,
  ): Promise<DashboardAnalyticsData> {
    const params = getDateParams(filter);
    if (provider === 'ACTIVITY') {
      params.page = String(page);
      params.limit = '5';
    }
    const response = await apiClient.get<unknown>(analyticsPaths[provider], { params });
    return assertApiData(response, (value): value is DashboardAnalyticsData =>
      isDashboardAnalyticsData(provider, value),
    );
  },
};

export type {
  ActivityAnalytics,
  ApprovalAnalytics,
  DepartmentAnalytics,
  OrganizationAnalytics,
  RequestAnalytics,
  UserAnalytics,
};
