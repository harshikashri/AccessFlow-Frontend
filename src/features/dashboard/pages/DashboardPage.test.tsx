import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type {
  DashboardConfiguration,
  DashboardDateRangeFilter,
  DashboardSummary,
  DashboardWidget,
} from '@/features/dashboard/types/dashboard.types';

const dashboardServiceMock = vi.hoisted(() => ({
  getConfiguration: vi.fn(),
  getSummary: vi.fn(),
  getAnalytics: vi.fn(),
}));

vi.mock('@/features/dashboard/services/dashboard.service', () => ({
  dashboardService: dashboardServiceMock,
}));

const dateRange = {
  range: 'LAST_30_DAYS' as const,
  fromDate: '2026-10-15T00:00:00.000Z',
  toDate: '2026-11-14T00:00:00.000Z',
  timeZone: 'UTC',
  interval: '[fromDate, toDate)',
};

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
      departmentPermissions: {},
    },
  };
}

function createWidget(overrides: Partial<DashboardWidget> = {}): DashboardWidget {
  return {
    key: 'REQUEST_SUMMARY',
    title: 'Request summary',
    description: 'Requests visible to this session',
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

function createConfiguration(
  user: AuthenticatedUser,
  widgets: DashboardWidget[] = [createWidget()],
  dashboardType: 'DYNAMIC' | 'PLATFORM' = 'DYNAMIC',
): DashboardConfiguration {
  return {
    dashboardType,
    userContext: { userId: user.id, organizationId: user.organizationId },
    widgets,
    availableFilters: { dateRange: ['LAST_30_DAYS', 'CUSTOM'] },
    dateRangeOptions: {
      timeZone: 'UTC',
      interval: '[fromDate, toDate)',
      maxCustomRangeDays: 366,
    },
  };
}

function createSummary(
  dashboardType: DashboardSummary['dashboardType'] = 'DYNAMIC',
  kpis: DashboardSummary['kpis'] = [
    {
      key: 'MY_TOTAL_REQUESTS',
      title: 'My Total Requests',
      value: 7,
      format: 'NUMBER',
      trend: null,
    },
  ],
  widgets: DashboardWidget[] = [createWidget()],
): DashboardSummary {
  return {
    dashboardType,
    dateRange,
    widgets,
    deferredWidgets: [],
    kpis,
  };
}

function createAuthContext(user: AuthenticatedUser): AuthContextValue {
  return {
    status: 'authenticated',
    authorizationStatus: 'available',
    user,
    error: null,
    isInitializing: false,
    isAuthenticated: true,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    logoutAll: vi.fn().mockResolvedValue(0),
    restoreSession: vi.fn().mockResolvedValue(undefined),
    refreshCurrentUser: vi.fn().mockResolvedValue(user),
  };
}

function renderDashboard(user: AuthenticatedUser) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createAuthContext(user)}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  dashboardServiceMock.getConfiguration.mockReset();
  dashboardServiceMock.getSummary.mockReset();
  dashboardServiceMock.getAnalytics.mockReset();
});

describe('DashboardPage', () => {
  it('renders only the API-configured tenant widgets and their real KPI/analytics data', async () => {
    const user = createTenantUser();
    const configuration = createConfiguration(user);
    dashboardServiceMock.getConfiguration.mockResolvedValue(configuration);
    dashboardServiceMock.getSummary.mockResolvedValue(createSummary());
    dashboardServiceMock.getAnalytics.mockResolvedValue({
      scope: 'AUTHORIZED_REQUEST_HISTORY',
      grouping: 'DAILY',
      requestTrends: [],
      statusDistribution: [],
      requestTypes: [],
      requestVolumeComparison: {
        currentPeriodCount: 4,
        previousPeriodCount: 3,
        absoluteDifference: 1,
        percentageChange: 33.3,
      },
      dateRange,
    });

    renderDashboard(user);

    expect(await screen.findByText('My Total Requests')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('Request trends')).toBeTruthy();
    expect(screen.getAllByText('No data is available for this range.').length).toBeGreaterThan(0);
    expect(screen.queryByText('Approval status')).toBeNull();
    expect(dashboardServiceMock.getAnalytics).toHaveBeenCalledWith(
      'REQUESTS',
      { range: 'LAST_30_DAYS' },
      1,
    );
  });

  it('renders platform KPIs and only requests platform analytics providers', async () => {
    const user: AuthenticatedUser = {
      ...createTenantUser(),
      platformRole: 'SUPER_ADMIN',
      organizationId: null,
      authorization: {
        platformPermissions: [],
        organizationPermissions: [],
        departmentPermissions: {},
      },
    };
    const widgets = [
      createWidget({
        key: 'PLATFORM_OVERVIEW',
        title: 'Platform overview',
        category: 'PLATFORM',
        scope: 'PLATFORM',
        kpiProvider: 'PLATFORM',
        analyticsProvider: null,
        analyticsStatus: 'DEFERRED',
      }),
      createWidget({
        key: 'ORGANIZATION_ANALYTICS',
        title: 'Organization analytics',
        category: 'PLATFORM',
        scope: 'PLATFORM',
        kpiProvider: null,
        kpiStatus: 'DEFERRED',
        analyticsProvider: 'ORGANIZATIONS',
      }),
    ];
    dashboardServiceMock.getConfiguration.mockResolvedValue(
      createConfiguration(user, widgets, 'PLATFORM'),
    );
    dashboardServiceMock.getSummary.mockResolvedValue(
      createSummary(
        'PLATFORM',
        [
          {
            key: 'TOTAL_ORGANIZATIONS',
            title: 'Total Organizations',
            value: 2,
            format: 'NUMBER',
            trend: null,
          },
        ],
        widgets,
      ),
    );
    dashboardServiceMock.getAnalytics.mockResolvedValue({
      scope: 'PLATFORM',
      grouping: 'DAILY',
      registrationTrends: [],
      statusDistribution: [],
      organizationComparison: {
        currentPeriodCount: 2,
        previousPeriodCount: 1,
        absoluteDifference: 1,
        percentageChange: 100,
      },
      organizations: [],
      dateRange,
    });

    renderDashboard(user);

    expect(await screen.findByText('Platform dashboard')).toBeTruthy();
    expect(screen.getByText('Total Organizations')).toBeTruthy();
    expect((await screen.findAllByText('2')).length).toBeGreaterThan(0);
    expect(screen.getByText('Organization registrations')).toBeTruthy();
    expect(screen.getByRole('link', { name: /view organizations/i })).toBeTruthy();
    expect(dashboardServiceMock.getAnalytics).toHaveBeenCalledTimes(1);
    expect(dashboardServiceMock.getAnalytics).toHaveBeenCalledWith(
      'ORGANIZATIONS',
      { range: 'LAST_30_DAYS' },
      1,
    );
  });

  it('applies only the supported custom UTC date range when requested', async () => {
    const user = createTenantUser();
    dashboardServiceMock.getConfiguration.mockResolvedValue(createConfiguration(user));
    dashboardServiceMock.getSummary.mockResolvedValue(createSummary());
    dashboardServiceMock.getAnalytics.mockResolvedValue({
      scope: 'AUTHORIZED_REQUEST_HISTORY',
      grouping: 'DAILY',
      requestTrends: [],
      statusDistribution: [],
      requestTypes: [],
      requestVolumeComparison: {
        currentPeriodCount: 0,
        previousPeriodCount: 0,
        absoluteDifference: 0,
        percentageChange: null,
      },
      dateRange,
    });

    renderDashboard(user);
    await screen.findByText('My Total Requests');
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: 'CUSTOM' } });
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: yesterday } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: today } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(dashboardServiceMock.getSummary).toHaveBeenLastCalledWith({
        range: 'CUSTOM',
        fromDate: yesterday,
        toDate: today,
      } satisfies DashboardDateRangeFilter),
    );
  });

  it('rejects configuration returned for a different authenticated user', async () => {
    const user = createTenantUser();
    dashboardServiceMock.getConfiguration.mockResolvedValue({
      ...createConfiguration(user),
      userContext: { userId: 'another-user', organizationId: user.organizationId },
    });

    renderDashboard(user);

    expect(
      await screen.findByText(
        'The dashboard configuration does not match the current access context.',
      ),
    ).toBeTruthy();
    expect(dashboardServiceMock.getSummary).not.toHaveBeenCalled();
    expect(dashboardServiceMock.getAnalytics).not.toHaveBeenCalled();
  });
});
