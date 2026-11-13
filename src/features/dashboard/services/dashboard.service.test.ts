import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import type {
  DashboardAnalyticsProvider,
  DashboardDateRangeFilter,
} from '@/features/dashboard/types/dashboard.types';

const apiClientMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/services/api/api-client', () => ({ apiClient: apiClientMock }));

const dateRange = {
  range: 'LAST_30_DAYS',
  fromDate: '2026-10-15T00:00:00.000Z',
  toDate: '2026-11-14T00:00:00.000Z',
  timeZone: 'UTC',
  interval: '[fromDate, toDate)',
};
const defaultFilter: DashboardDateRangeFilter = { range: 'LAST_30_DAYS' };

function envelope(data: unknown) {
  return { data: { success: true, message: 'Dashboard response', data } };
}

const analyticsResponse: Record<DashboardAnalyticsProvider, unknown> = {
  ORGANIZATIONS: {
    scope: 'PLATFORM',
    grouping: 'DAILY',
    registrationTrends: [],
    statusDistribution: [],
    organizationComparison: {},
    organizations: [],
    dateRange,
  },
  USERS: {
    scope: 'ORGANIZATION',
    grouping: 'DAILY',
    userCounts: {},
    registrationTrends: [],
    byDepartment: [],
    dateRange,
  },
  REQUESTS: {
    scope: 'ORGANIZATION',
    grouping: 'DAILY',
    requestTrends: [],
    statusDistribution: [],
    requestTypes: [],
    requestVolumeComparison: {},
    dateRange,
  },
  APPROVALS: {
    scope: 'AUTHORIZED_APPROVAL_ASSIGNMENTS',
    approvalStatusDistribution: [],
    decisions: [],
    stages: [],
    workload: {},
    performance: {},
    dateRange,
  },
  DEPARTMENTS: {
    scope: 'PLATFORM',
    totalDepartments: 0,
    statusDistribution: [],
    byOrganization: [],
    departmentGrowth: [],
    grouping: 'DAILY',
    dateRange,
  },
  ACTIVITY: {
    scope: 'ORGANIZATION',
    items: [],
    pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
    dateRange,
  },
};

beforeEach(() => {
  apiClientMock.get.mockReset();
});

describe('dashboard service', () => {
  it('uses the exact configuration and summary routes and date parameters', async () => {
    const widget = {
      key: 'REQUEST_SUMMARY',
      title: 'Requests',
      description: 'Request analytics',
      category: 'REQUESTS',
      scope: 'ORGANIZATION',
      supportedFilters: ['dateRange'],
      kpiProvider: 'REQUESTS',
      kpiStatus: 'IMPLEMENTED',
      analyticsProvider: 'REQUESTS',
      analyticsStatus: 'IMPLEMENTED',
    };
    apiClientMock.get.mockResolvedValueOnce(
      envelope({
        dashboardType: 'DYNAMIC',
        userContext: { userId: 'user-1', organizationId: 'org-1' },
        widgets: [widget],
        availableFilters: { dateRange: ['LAST_30_DAYS', 'CUSTOM'] },
        dateRangeOptions: {
          timeZone: 'UTC',
          interval: '[fromDate, toDate)',
          maxCustomRangeDays: 366,
        },
      }),
    );

    await dashboardService.getConfiguration();
    expect(apiClientMock.get).toHaveBeenNthCalledWith(1, '/dashboard/config');

    const customRange: DashboardDateRangeFilter = {
      range: 'CUSTOM',
      fromDate: '2026-11-01',
      toDate: '2026-11-14',
    };
    apiClientMock.get.mockResolvedValueOnce(
      envelope({
        dashboardType: 'DYNAMIC',
        dateRange,
        widgets: [widget],
        deferredWidgets: [],
        kpis: [
          {
            key: 'MY_TOTAL_REQUESTS',
            title: 'My Total Requests',
            value: 3,
            format: 'NUMBER',
            trend: null,
          },
        ],
      }),
    );
    await dashboardService.getSummary(customRange);
    expect(apiClientMock.get).toHaveBeenNthCalledWith(2, '/dashboard/summary', {
      params: { range: 'CUSTOM', fromDate: '2026-11-01', toDate: '2026-11-14' },
    });
  });

  it('maps every known analytics provider to its backend route', async () => {
    const expectedPaths: Record<DashboardAnalyticsProvider, string> = {
      ORGANIZATIONS: '/dashboard/organization-analytics',
      USERS: '/dashboard/user-analytics',
      REQUESTS: '/dashboard/request-analytics',
      APPROVALS: '/dashboard/approval-analytics',
      DEPARTMENTS: '/dashboard/department-analytics',
      ACTIVITY: '/dashboard/recent-activity',
    };

    for (const provider of Object.keys(expectedPaths) as DashboardAnalyticsProvider[]) {
      apiClientMock.get.mockResolvedValueOnce(envelope(analyticsResponse[provider]));
      await dashboardService.getAnalytics(provider, defaultFilter, 2);
      const params =
        provider === 'ACTIVITY'
          ? { range: 'LAST_30_DAYS', page: '2', limit: '5' }
          : { range: 'LAST_30_DAYS' };
      expect(apiClientMock.get).toHaveBeenLastCalledWith(expectedPaths[provider], { params });
    }
  });

  it('rejects custom ranges without both bounds and malformed successful responses', async () => {
    await expect(
      dashboardService.getSummary({ range: 'CUSTOM', fromDate: '2026-11-01' }),
    ).rejects.toThrow(/both dates/);
    expect(apiClientMock.get).not.toHaveBeenCalled();

    apiClientMock.get.mockResolvedValueOnce(envelope({ dashboardType: 'DYNAMIC' }));
    await expect(dashboardService.getConfiguration()).rejects.toThrow(/unsupported response/);
  });
});
