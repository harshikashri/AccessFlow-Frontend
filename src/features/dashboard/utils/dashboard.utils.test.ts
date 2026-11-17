import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type {
  DashboardConfiguration,
  DashboardKpi,
  DashboardWidget,
} from '@/features/dashboard/types/dashboard.types';
import {
  formatDashboardKpi,
  getAnalyticsProviders,
  getAuthorizedDashboardWidgets,
  getDashboardSectionWidgets,
  getDashboardKpis,
  isValidDashboardDateFilter,
} from '@/features/dashboard/utils/dashboard.utils';

const departmentId = '64b000000000000000000001';

function createTenantUser(): AuthenticatedUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole: null,
    organizationId: 'org-1',
    authorization: {
      platformPermissions: [],
      organizationPermissions: ['dashboard.view', 'requests.view', 'requests.create'],
      departmentPermissions: {
        [departmentId]: ['requests.approve'],
      },
    },
  };
}

function widget(overrides: Partial<DashboardWidget>): DashboardWidget {
  return {
    key: 'REQUEST_SUMMARY',
    title: 'Requests',
    description: 'Request summary',
    category: 'REQUESTS',
    scope: 'AUTHORIZED_REQUEST_HISTORY',
    supportedFilters: ['dateRange'],
    kpiProvider: 'REQUESTS',
    kpiStatus: 'IMPLEMENTED',
    analyticsProvider: 'REQUESTS',
    analyticsStatus: 'IMPLEMENTED',
    ...overrides,
  };
}

function kpi(key: string, value: number): DashboardKpi {
  return { key, title: key, value, format: 'NUMBER', trend: null };
}

describe('dashboard utilities', () => {
  it('filters dynamic widget configuration using the existing effective permission scopes', () => {
    const user = createTenantUser();
    const configuration: DashboardConfiguration = {
      dashboardType: 'DYNAMIC',
      userContext: { userId: user.id, organizationId: user.organizationId },
      widgets: [
        widget({ key: 'REQUEST_SUMMARY' }),
        widget({
          key: 'APPROVAL_SUMMARY',
          kpiProvider: 'APPROVALS',
          analyticsProvider: 'APPROVALS',
        }),
        widget({ key: 'REQUEST_CREATE', kpiProvider: null, analyticsProvider: null }),
        widget({ key: 'ROLE_OVERVIEW', kpiProvider: 'ROLES', analyticsProvider: null }),
        widget({ key: 'UNKNOWN_WIDGET' }),
      ],
      availableFilters: { dateRange: ['LAST_30_DAYS'] },
      dateRangeOptions: {
        timeZone: 'UTC',
        interval: '[fromDate, toDate)',
        maxCustomRangeDays: 366,
      },
    };

    expect(getAuthorizedDashboardWidgets(configuration, user).map((item) => item.key)).toEqual([
      'REQUEST_SUMMARY',
      'APPROVAL_SUMMARY',
      'REQUEST_CREATE',
    ]);
  });

  it('filters organization dashboard subsections to their configured widget', () => {
    const user = createTenantUser();
    user.authorization.organizationPermissions = [
      'dashboard.view',
      'requests.view',
      'requests.approve',
      'users.view',
      'departments.view',
    ];
    const widgets = [
      widget({ key: 'REQUEST_SUMMARY' }),
      widget({ key: 'APPROVAL_SUMMARY', analyticsProvider: 'APPROVALS' }),
      widget({ key: 'APPROVAL_ACTIVITY', analyticsProvider: 'APPROVALS' }),
      widget({ key: 'USER_STATISTICS', analyticsProvider: 'USERS' }),
      widget({ key: 'DEPARTMENT_OVERVIEW', analyticsProvider: 'DEPARTMENTS' }),
    ];
    const configuration: DashboardConfiguration = {
      dashboardType: 'DYNAMIC',
      userContext: { userId: user.id, organizationId: user.organizationId },
      widgets,
      availableFilters: { dateRange: ['LAST_30_DAYS'] },
      dateRangeOptions: {
        timeZone: 'UTC',
        interval: '[fromDate, toDate)',
        maxCustomRangeDays: 366,
      },
    };

    expect(
      getDashboardSectionWidgets(configuration, user, 'request-summary').map(({ key }) => key),
    ).toEqual(['REQUEST_SUMMARY']);
    expect(
      getDashboardSectionWidgets(configuration, user, 'approval-summary').map(({ key }) => key),
    ).toEqual(['APPROVAL_SUMMARY']);
    expect(
      getDashboardSectionWidgets(configuration, user, 'approval-activity').map(({ key }) => key),
    ).toEqual(['APPROVAL_ACTIVITY']);
    expect(
      getDashboardSectionWidgets(configuration, user, 'user-statistics').map(({ key }) => key),
    ).toEqual(['USER_STATISTICS']);
    expect(
      getDashboardSectionWidgets(configuration, user, 'department-overview').map(({ key }) => key),
    ).toEqual(['DEPARTMENT_OVERVIEW']);
  });

  it('shows only analytics providers and KPI groups configured as implemented', () => {
    const widgets = [
      widget({ key: 'REQUEST_SUMMARY' }),
      widget({
        key: 'APPROVAL_SUMMARY',
        kpiProvider: 'APPROVALS',
        analyticsProvider: 'APPROVALS',
      }),
      widget({
        key: 'REQUEST_CREATE',
        kpiProvider: null,
        kpiStatus: 'DEFERRED',
        analyticsProvider: null,
        analyticsStatus: 'DEFERRED',
      }),
      widget({
        key: 'FUTURE_WIDGET',
        analyticsProvider: 'UNKNOWN',
      }),
    ];

    expect(getAnalyticsProviders(widgets)).toEqual(['REQUESTS', 'APPROVALS']);
    expect(
      getDashboardKpis(
        [kpi('MY_TOTAL_REQUESTS', 4), kpi('PENDING_MY_APPROVAL', 2), kpi('UNKNOWN', 8)],
        widgets,
      ).map((item) => item.key),
    ).toEqual(['MY_TOTAL_REQUESTS', 'PENDING_MY_APPROVAL']);
  });

  it('filters platform dashboard widgets into their dedicated analytics sections', () => {
    const user: AuthenticatedUser = {
      ...createTenantUser(),
      platformRole: 'SUPER_ADMIN',
      organizationId: null,
    };
    const configuration: DashboardConfiguration = {
      dashboardType: 'PLATFORM',
      userContext: { userId: user.id, organizationId: null },
      widgets: [
        widget({ key: 'PLATFORM_OVERVIEW', scope: 'PLATFORM', kpiProvider: 'PLATFORM' }),
        widget({
          key: 'ORGANIZATION_ANALYTICS',
          scope: 'PLATFORM',
          kpiProvider: null,
          analyticsProvider: 'ORGANIZATIONS',
        }),
        widget({
          key: 'USER_ANALYTICS',
          scope: 'PLATFORM',
          kpiProvider: null,
          analyticsProvider: 'USERS',
        }),
        widget({
          key: 'PLATFORM_USAGE_ANALYTICS',
          scope: 'PLATFORM',
          kpiProvider: null,
          analyticsProvider: 'REQUESTS',
        }),
        widget({
          key: 'PLATFORM_ACTIVITY',
          scope: 'PLATFORM',
          kpiProvider: null,
          analyticsProvider: 'ACTIVITY',
        }),
        widget({
          key: 'DEPARTMENT_ANALYTICS',
          scope: 'PLATFORM',
          kpiProvider: null,
          analyticsProvider: 'DEPARTMENTS',
        }),
      ],
      availableFilters: { dateRange: ['LAST_30_DAYS'] },
      dateRangeOptions: {
        timeZone: 'UTC',
        interval: '[fromDate, toDate)',
        maxCustomRangeDays: 366,
      },
    };

    expect(
      getDashboardSectionWidgets(configuration, user, 'overview').map((item) => item.key),
    ).toEqual([
      'PLATFORM_OVERVIEW',
      'ORGANIZATION_ANALYTICS',
      'USER_ANALYTICS',
      'PLATFORM_USAGE_ANALYTICS',
    ]);
    expect(
      getDashboardSectionWidgets(configuration, user, 'organization-analytics').map(
        (item) => item.key,
      ),
    ).toEqual(['ORGANIZATION_ANALYTICS']);
    expect(
      getDashboardSectionWidgets(configuration, user, 'user-analytics').map((item) => item.key),
    ).toEqual(['USER_ANALYTICS']);
    const platformUsage = getDashboardSectionWidgets(configuration, user, 'platform-usage');
    expect(platformUsage.map((item) => item.key)).toEqual([
      'PLATFORM_USAGE_ANALYTICS',
      'PLATFORM_ACTIVITY',
    ]);
    expect(getAnalyticsProviders(platformUsage)).toEqual(['REQUESTS', 'ACTIVITY']);
  });

  it('formats unspecified amounts without inventing a currency', () => {
    expect(formatDashboardKpi(1234.5, 'AMOUNT', 'REQUEST_AMOUNT_UNSPECIFIED')).toContain(
      'REQUEST_AMOUNT_UNSPECIFIED',
    );
    expect(formatDashboardKpi(1234.5, 'AMOUNT')).not.toMatch(/[₹$€]/);
  });

  it('validates custom date ranges against the backend limit and rejects future or inverted dates', () => {
    const today = new Date('2026-11-14T12:00:00.000Z');
    expect(
      isValidDashboardDateFilter(
        { range: 'CUSTOM', fromDate: '2026-01-01', toDate: '2026-11-14' },
        366,
        today,
      ),
    ).toBe(true);
    expect(
      isValidDashboardDateFilter(
        { range: 'CUSTOM', fromDate: '2025-11-12', toDate: '2026-11-14' },
        366,
        today,
      ),
    ).toBe(false);
    expect(
      isValidDashboardDateFilter(
        { range: 'CUSTOM', fromDate: '2026-11-15', toDate: '2026-11-16' },
        366,
        today,
      ),
    ).toBe(false);
    expect(
      isValidDashboardDateFilter(
        { range: 'CUSTOM', fromDate: '2026-11-10', toDate: '2026-11-01' },
        366,
        today,
      ),
    ).toBe(false);
  });
});
