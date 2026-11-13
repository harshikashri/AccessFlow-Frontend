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
