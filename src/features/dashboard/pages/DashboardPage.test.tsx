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
  DashboardSection,
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

function renderDashboard(user: AuthenticatedUser, section: DashboardSection = 'overview') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createAuthContext(user)}>
        <MemoryRouter>
          <DashboardPage section={section} />
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
  it('renders the organization welcome and request summary from configured dashboard data', async () => {
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

    expect(await screen.findByRole('heading', { name: 'Welcome back, Test User!' })).toBeTruthy();
    expect(screen.getByText('My Total Requests')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.queryByText('Request trends')).toBeNull();
    expect(screen.queryByText('Approval status')).toBeNull();
    expect(dashboardServiceMock.getAnalytics).toHaveBeenCalledWith(
      'REQUESTS',
      { range: 'LAST_30_DAYS' },
      1,
    );
  });

  it('rejects analytics returned for a different dashboard scope', async () => {
    const user = createTenantUser();
    dashboardServiceMock.getConfiguration.mockResolvedValue(createConfiguration(user));
    dashboardServiceMock.getSummary.mockResolvedValue(createSummary());
    dashboardServiceMock.getAnalytics.mockResolvedValue({
      scope: 'PLATFORM',
      grouping: 'DAILY',
      requestTrends: [],
      statusDistribution: [{ status: 'APPROVED', count: 99 }],
      requestTypes: [],
      requestVolumeComparison: {
        currentPeriodCount: 99,
        previousPeriodCount: 0,
        absoluteDifference: 99,
        percentageChange: 100,
      },
      dateRange,
    });

    renderDashboard(user);

    expect(
      await screen.findByText('The dashboard API returned data for a different scope.'),
    ).toBeTruthy();
    expect(screen.queryByText('Approved Requests')).toBeNull();
  });

  it('arranges authorized request, employee, and organization metrics in the overview layout', async () => {
    const user: AuthenticatedUser = {
      ...createTenantUser(),
      authorization: {
        platformPermissions: [],
        organizationPermissions: [
          'dashboard.view',
          'requests.view',
          'requests.approve',
          'users.view',
          'departments.view',
          'roles.view',
        ],
        departmentPermissions: {},
      },
    };
    const widgets = [
      createWidget(),
      createWidget({
        key: 'APPROVAL_SUMMARY',
        title: 'Approval summary',
        category: 'APPROVALS',
        scope: 'AUTHORIZED_APPROVAL_ASSIGNMENTS',
        kpiProvider: 'APPROVALS',
        analyticsProvider: 'APPROVALS',
      }),
      createWidget({
        key: 'USER_STATISTICS',
        title: 'User statistics',
        category: 'USERS',
        scope: 'ORGANIZATION',
        kpiProvider: 'ORGANIZATION',
        analyticsProvider: 'USERS',
      }),
      createWidget({
        key: 'DEPARTMENT_OVERVIEW',
        title: 'Department overview',
        category: 'DEPARTMENTS',
        scope: 'ORGANIZATION',
        kpiProvider: 'ORGANIZATION',
        analyticsProvider: 'DEPARTMENTS',
      }),
      createWidget({
        key: 'ROLE_OVERVIEW',
        title: 'Role overview',
        category: 'ROLES',
        scope: 'ORGANIZATION',
        kpiProvider: 'ROLES',
        kpiStatus: 'IMPLEMENTED',
        analyticsProvider: null,
        analyticsStatus: 'DEFERRED',
      }),
    ];
    const configuration = createConfiguration(user, widgets);
    const kpis: DashboardSummary['kpis'] = [
      ['TOTAL_REQUESTS', 'Total Requests', 6],
      ['PENDING_REQUESTS', 'Pending Requests', 2],
      ['APPROVED_REQUESTS', 'Approved Requests', 2],
      ['REJECTED_REQUESTS', 'Rejected Requests', 1],
      ['RETURNED_REQUESTS', 'Returned Requests', 1],
      ['PENDING_APPROVAL', 'Pending Approval', 3],
      ['AVAILABLE_TO_CLAIM', 'Available to Claim', 1],
      ['APPROVED_DECISIONS', 'Approved Decisions', 2],
      ['REJECTED_DECISIONS', 'Rejected Decisions', 0],
      ['RETURNED_DECISIONS', 'Returned Decisions', 0],
      ['OVERDUE_APPROVALS', 'Overdue Approvals', 0],
      ['TOTAL_EMPLOYEES', 'Total Employees', 7],
      ['TOTAL_DEPARTMENTS', 'Total Departments', 2],
      ['TOTAL_ROLES', 'Total Roles', 4],
      ['BUILT_IN_ROLES', 'Built-in Roles', 3],
      ['CUSTOM_ROLES', 'Custom Roles', 1],
      ['ACTIVE_ROLE_ASSIGNMENTS', 'Active Role Assignments', 14],
    ].map(([key, title, value]) => ({
      key: String(key),
      title: String(title),
      value: Number(value),
      format: 'NUMBER' as const,
      trend: null,
    }));

    dashboardServiceMock.getConfiguration.mockResolvedValue(configuration);
    dashboardServiceMock.getSummary.mockResolvedValue(createSummary('DYNAMIC', kpis, widgets));
    dashboardServiceMock.getAnalytics.mockImplementation((provider: string) => {
      if (provider === 'REQUESTS') {
        return Promise.resolve({
          scope: 'AUTHORIZED_REQUEST_HISTORY',
          grouping: 'DAILY',
          requestTrends: [],
          statusDistribution: [
            { status: 'PENDING', count: 2 },
            { status: 'APPROVED', count: 2 },
            { status: 'REJECTED', count: 1 },
            { status: 'RETURNED', count: 1 },
          ],
          requestTypes: [],
          requestVolumeComparison: {
            currentPeriodCount: 6,
            previousPeriodCount: 4,
            absoluteDifference: 2,
            percentageChange: 50,
          },
          dateRange,
        });
      }
      if (provider === 'APPROVALS') {
        return Promise.resolve({
          scope: 'AUTHORIZED_APPROVAL_ASSIGNMENTS',
          approvalStatusDistribution: [{ status: 'PENDING', count: 3 }],
          decisions: [{ decision: 'APPROVED', count: 2 }],
          stages: [],
          workload: {
            pendingApprovalStages: 3,
            availableToClaimStages: 1,
            currentlyOverdueStages: 0,
          },
          performance: {
            completedDecisions: 2,
            delegatedDecisions: 0,
            averageDecisionMinutes: null,
            medianDecisionMinutes: null,
            slaDecisionSampleSize: 0,
            onTimeDecisions: 0,
            overdueDecisions: 0,
            slaCompliancePercentage: null,
          },
          dateRange,
        });
      }
      if (provider === 'USERS') {
        return Promise.resolve({
          scope: 'ORGANIZATION',
          grouping: 'DAILY',
          userCounts: { totalUsers: 7, activeUsers: 6, inactiveUsers: 1 },
          registrationTrends: [],
          byDepartment: [],
          dateRange,
        });
      }
      return Promise.resolve({
        scope: 'ORGANIZATION',
        departmentDirectory: {
          total: 2,
          active: 2,
          inactive: 0,
          departments: [],
        },
        dateRange,
      });
    });

    renderDashboard(user);

    expect(await screen.findByRole('heading', { name: 'Welcome back, Test User!' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Employees Overview' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Organization Structure' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Quick Insights' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Employees by status/ })).toBeTruthy();
    expect(screen.getByText('3 built-in · 1 custom')).toBeTruthy();
  });

  it('links authorized department-directory rows to department details', async () => {
    const user: AuthenticatedUser = {
      ...createTenantUser(),
      authorization: {
        platformPermissions: [],
        organizationPermissions: ['dashboard.view', 'departments.view'],
        departmentPermissions: {},
      },
    };
    const widget = createWidget({
      key: 'DEPARTMENT_OVERVIEW',
      title: 'Department overview',
      category: 'DEPARTMENTS',
      scope: 'ORGANIZATION',
      kpiProvider: null,
      kpiStatus: 'DEFERRED',
      analyticsProvider: 'DEPARTMENTS',
      analyticsStatus: 'IMPLEMENTED',
    });
    dashboardServiceMock.getConfiguration.mockResolvedValue(createConfiguration(user, [widget]));
    dashboardServiceMock.getSummary.mockResolvedValue(createSummary('DYNAMIC', [], [widget]));
    dashboardServiceMock.getAnalytics.mockResolvedValue({
      scope: 'ORGANIZATION',
      departmentDirectory: {
        total: 1,
        active: 1,
        inactive: 0,
        departments: [
          {
            departmentId: '64b000000000000000000001',
            departmentName: 'Engineering',
            status: 'ACTIVE',
          },
        ],
      },
      dateRange,
    });

    renderDashboard(user, 'department-overview');

    const departmentLink = await screen.findByRole('link', { name: 'Engineering' });
    expect(departmentLink.getAttribute('href')).toBe('/departments/64b000000000000000000001');
  });

  it('renders the platform dashboard overview as summary cards and a two-column analytics grid', async () => {
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
      createWidget({
        key: 'USER_ANALYTICS',
        title: 'User analytics',
        category: 'PLATFORM',
        scope: 'PLATFORM',
        kpiProvider: null,
        kpiStatus: 'DEFERRED',
        analyticsProvider: 'USERS',
      }),
      createWidget({
        key: 'PLATFORM_USAGE_ANALYTICS',
        title: 'Platform usage',
        category: 'PLATFORM',
        scope: 'PLATFORM',
        kpiProvider: null,
        kpiStatus: 'DEFERRED',
        analyticsProvider: 'REQUESTS',
      }),
      createWidget({
        key: 'DEPARTMENT_ANALYTICS',
        title: 'Department analytics',
        category: 'PLATFORM',
        scope: 'PLATFORM',
        kpiProvider: null,
        kpiStatus: 'DEFERRED',
        analyticsProvider: 'DEPARTMENTS',
      }),
    ];
    dashboardServiceMock.getConfiguration.mockResolvedValue(
      createConfiguration(user, widgets, 'PLATFORM'),
    );
    dashboardServiceMock.getSummary.mockResolvedValue(
      createSummary(
        'PLATFORM',
        [
          ['TOTAL_ORGANIZATIONS', 'Total Organizations', 2],
          ['ACTIVE_ORGANIZATIONS', 'Active Organizations', 1],
          ['INACTIVE_ORGANIZATIONS', 'Inactive Organizations', 1],
          ['NEW_ORGANIZATIONS', 'New Organizations', 1],
          ['TOTAL_USERS', 'Total Users', 18],
          ['ACTIVE_USERS', 'Active Users', 10],
          ['INACTIVE_USERS', 'Inactive Users', 8],
          ['TOTAL_REQUESTS', 'Total Requests', 7],
          ['PENDING_REQUESTS', 'Pending Requests', 1],
          ['APPROVED_REQUESTS', 'Approved Requests', 2],
          ['CANCELLED_REQUESTS', 'Cancelled Requests', 4],
          ['TOTAL_DEPARTMENTS', 'Total Departments', 2],
          ['TOTAL_ORGANIZATION_MEMBERSHIPS', 'Total Memberships', 17],
          ['ACTIVE_ORGANIZATION_MEMBERSHIPS', 'Active Memberships', 17],
          ['INACTIVE_ORGANIZATION_MEMBERSHIPS', 'Inactive Memberships', 0],
        ].map(([key, title, value]) => ({
          key: String(key),
          title: String(title),
          value: Number(value),
          format: 'NUMBER' as const,
          trend: null,
        })),
        widgets,
      ),
    );
    dashboardServiceMock.getAnalytics.mockImplementation((provider: string) =>
      Promise.resolve(
        provider === 'ORGANIZATIONS'
          ? {
              scope: 'PLATFORM',
              grouping: 'DAILY',
              registrationTrends: [],
              statusDistribution: [
                { status: 'ACTIVE', count: 1 },
                { status: 'INACTIVE', count: 1 },
              ],
              organizationComparison: {
                currentPeriodCount: 1,
                previousPeriodCount: 0,
                absoluteDifference: 1,
                percentageChange: 100,
              },
              organizations: [],
              dateRange,
            }
          : provider === 'USERS'
            ? {
                scope: 'PLATFORM',
                grouping: 'DAILY',
                userCounts: {
                  totalUniqueUsers: 18,
                  activeUniqueUsers: 10,
                  inactiveUniqueUsers: 8,
                  activeUserBasis: 'UNIQUE_USERS',
                },
                membershipCounts: { total: 17, active: 17, inactive: 0 },
                byOrganization: [],
                byRoleCategory: [],
                registrationTrends: [],
                dateRange,
              }
            : {
                scope: 'PLATFORM',
                grouping: 'DAILY',
                requestTrends: [],
                statusDistribution: [
                  { status: 'APPROVED', count: 2 },
                  { status: 'PENDING', count: 1 },
                  { status: 'CANCELLED', count: 4 },
                ],
                requestTypes: [],
                requestVolumeComparison: {
                  currentPeriodCount: 7,
                  previousPeriodCount: 0,
                  absoluteDifference: 7,
                  percentageChange: null,
                },
                dateRange,
              },
      ),
    );

    renderDashboard(user);

    expect(await screen.findByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Total Organizations')).toBeTruthy();
    expect(screen.getByText('Total Users')).toBeTruthy();
    expect(screen.getByText('Total Requests')).toBeTruthy();
    expect(screen.getByText('Total Departments')).toBeTruthy();
    expect(await screen.findByText('Organization Overview')).toBeTruthy();
    expect(screen.getByText('User Overview')).toBeTruthy();
    expect(screen.getByText('Organization Memberships')).toBeTruthy();
    expect(screen.getByText('Request Overview')).toBeTruthy();
    expect(screen.queryByText('Organization registrations')).toBeNull();
    expect(screen.queryByText('Department analytics')).toBeNull();
    expect(dashboardServiceMock.getAnalytics).toHaveBeenCalledTimes(3);
    expect(dashboardServiceMock.getAnalytics).not.toHaveBeenCalledWith(
      'DEPARTMENTS',
      expect.anything(),
      expect.anything(),
    );
    expect(document.querySelectorAll('.platform-dashboard-kpi')).toHaveLength(4);
    expect(document.querySelector('.platform-dashboard-overview__grid')).toBeTruthy();
  });

  it.each([
    ['organization-analytics', 'ORGANIZATIONS', 'Organization registrations'],
    ['user-analytics', 'USERS', 'User registrations'],
    ['platform-usage', 'REQUESTS', 'Requests by status'],
  ] as const)(
    'shows only %s charts and loads their corresponding analytics',
    async (section, provider, chartTitle) => {
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
          category: 'PLATFORM',
          scope: 'PLATFORM',
          kpiProvider: 'PLATFORM',
          analyticsProvider: null,
          analyticsStatus: 'DEFERRED',
        }),
        createWidget({
          key: 'ORGANIZATION_ANALYTICS',
          category: 'PLATFORM',
          scope: 'PLATFORM',
          kpiProvider: null,
          kpiStatus: 'DEFERRED',
          analyticsProvider: 'ORGANIZATIONS',
        }),
        createWidget({
          key: 'USER_ANALYTICS',
          category: 'PLATFORM',
          scope: 'PLATFORM',
          kpiProvider: null,
          kpiStatus: 'DEFERRED',
          analyticsProvider: 'USERS',
        }),
        createWidget({
          key: 'PLATFORM_USAGE_ANALYTICS',
          category: 'PLATFORM',
          scope: 'PLATFORM',
          kpiProvider: null,
          kpiStatus: 'DEFERRED',
          analyticsProvider: 'REQUESTS',
        }),
        createWidget({
          key: 'DEPARTMENT_ANALYTICS',
          category: 'PLATFORM',
          scope: 'PLATFORM',
          kpiProvider: null,
          kpiStatus: 'DEFERRED',
          analyticsProvider: 'DEPARTMENTS',
        }),
      ];
      dashboardServiceMock.getConfiguration.mockResolvedValue(
        createConfiguration(user, widgets, 'PLATFORM'),
      );
      dashboardServiceMock.getSummary.mockResolvedValue(createSummary('PLATFORM', [], widgets));
      dashboardServiceMock.getAnalytics.mockResolvedValue(
        provider === 'ORGANIZATIONS'
          ? {
              scope: 'PLATFORM',
              grouping: 'DAILY',
              registrationTrends: [],
              statusDistribution: [],
              organizationComparison: {
                currentPeriodCount: 0,
                previousPeriodCount: 0,
                absoluteDifference: 0,
                percentageChange: null,
              },
              organizations: [],
              dateRange,
            }
          : provider === 'USERS'
            ? {
                scope: 'PLATFORM',
                grouping: 'DAILY',
                userCounts: {
                  totalUniqueUsers: 0,
                  activeUniqueUsers: 0,
                  inactiveUniqueUsers: 0,
                  activeUserBasis: 'UNIQUE_USERS',
                },
                membershipCounts: {},
                byOrganization: [],
                byRoleCategory: [],
                registrationTrends: [],
                dateRange,
              }
            : {
                scope: 'PLATFORM',
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
              },
      );

      renderDashboard(user, section);

      expect(await screen.findByText(chartTitle)).toBeTruthy();
      expect(dashboardServiceMock.getAnalytics).toHaveBeenCalledTimes(1);
      expect(dashboardServiceMock.getAnalytics).toHaveBeenCalledWith(
        provider,
        { range: 'LAST_30_DAYS' },
        1,
      );
      expect(dashboardServiceMock.getAnalytics).not.toHaveBeenCalledWith(
        'DEPARTMENTS',
        expect.anything(),
        expect.anything(),
      );
    },
  );

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
