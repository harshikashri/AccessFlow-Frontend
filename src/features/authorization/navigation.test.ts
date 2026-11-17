import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { getVisibleNavigation } from '@/features/authorization/navigation';
import type { AuthorizationInfo } from '@/features/authorization/authorization.types';
import type { NavigationItem } from '@/features/authorization/navigation.config';

const departmentId = '64b000000000000000000001';

function createUser(
  authorization: AuthorizationInfo,
  platformRole: 'SUPER_ADMIN' | null = null,
): AuthenticatedUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole,
    organizationId: platformRole ? null : 'org-1',
    authorization,
  };
}

function getVisibleItemIds(
  user: AuthenticatedUser,
  status: 'available' | 'loading' | 'unavailable',
) {
  const visit = (items: readonly NavigationItem[]): string[] =>
    items.flatMap((item) => [item.id, ...visit(item.children ?? [])]);
  return getVisibleNavigation(user, status).flatMap((section) => visit(section.items));
}

describe('permission-aware navigation', () => {
  it('shows only platform workspaces for a Super Admin session', () => {
    const user = createUser(
      { platformPermissions: [], organizationPermissions: [], departmentPermissions: {} },
      'SUPER_ADMIN',
    );

    expect(getVisibleItemIds(user, 'available')).toEqual([
      'platform-dashboard',
      'platform-organization-analytics',
      'platform-user-analytics',
      'platform-usage',
      'platform-audit-logs',
      'organizations',
    ]);
  });

  it('places platform analytics links beneath the Dashboard item', () => {
    const user = createUser(
      { platformPermissions: [], organizationPermissions: [], departmentPermissions: {} },
      'SUPER_ADMIN',
    );
    const platform = getVisibleNavigation(user, 'available')[0];
    const [dashboard] = platform?.items ?? [];

    expect(dashboard?.label).toBe('Dashboard');
    expect(dashboard?.children?.map(({ label }) => label)).toEqual([
      'Org analytics',
      'User analytics',
      'Platform usage',
    ]);
    expect(dashboard?.children?.map(({ path }) => path)).toEqual([
      '/dashboard/org-analytics',
      '/dashboard/user-analytics',
      '/dashboard/platform-usage',
    ]);
  });

  it('filters organization navigation by the exact granted permissions', () => {
    const user = createUser({
      platformPermissions: [],
      organizationPermissions: ['dashboard.view', 'roles.view', 'workflows.view'],
      departmentPermissions: {},
    });

    expect(getVisibleItemIds(user, 'available')).toEqual(['dashboard', 'roles', 'workflows']);
  });

  it('shows dashboard and request creation for a custom role when those permissions are granted', () => {
    const user = createUser({
      platformPermissions: [],
      organizationPermissions: ['dashboard.view', 'requests.create'],
      departmentPermissions: {},
      roleTypes: ['CUSTOM'],
    });

    expect(getVisibleItemIds(user, 'available')).toEqual([
      'dashboard',
      'request-center',
      'my-requests-category',
      'new-request',
    ]);
  });

  it('places organization analytics sections beneath Dashboard with permission filtering', () => {
    const user = createUser({
      platformPermissions: [],
      organizationPermissions: [
        'dashboard.view',
        'requests.view',
        'requests.approve',
        'users.view',
        'departments.view',
      ],
      departmentPermissions: {},
    });
    const workspace = getVisibleNavigation(user, 'available').find(({ id }) => id === 'workspace');
    const dashboard = workspace?.items[0];

    expect(dashboard?.children?.map(({ label }) => label)).toEqual([
      'Request summary',
      'Approval summary',
      'Approval activity',
      'User statistics',
      'Dept overview',
    ]);
  });

  it('exposes custom department grants without treating them as organization-wide access', () => {
    const user = createUser({
      platformPermissions: [],
      organizationPermissions: [],
      departmentPermissions: {
        [departmentId]: ['users.view', 'requests.view', 'audit_logs.view', 'roles.view'],
      },
    });

    expect(getVisibleItemIds(user, 'available')).toEqual([
      'users',
      'audit-logs',
      'request-center',
      'my-requests-category',
      'my-requests',
      'requests-category',
      'request-list',
    ]);
  });

  it('flattens Request Center navigation for Department Members', () => {
    const user = createUser({
      platformPermissions: [],
      organizationPermissions: [],
      departmentPermissions: {
        [departmentId]: ['users.view', 'requests.view', 'requests.create'],
      },
      roleTypes: ['EMPLOYEE'],
    });

    expect(getVisibleItemIds(user, 'available')).toEqual([
      'users',
      'request-center',
      'my-requests',
      'new-request',
    ]);
  });

  it('uses custom-role navigation when a Department Member also has a custom role', () => {
    const user = createUser({
      platformPermissions: [],
      organizationPermissions: [],
      departmentPermissions: {
        [departmentId]: ['users.view', 'requests.view', 'requests.create'],
      },
      roleTypes: ['EMPLOYEE', 'CUSTOM'],
    });

    expect(getVisibleItemIds(user, 'available')).toEqual([
      'users',
      'request-center',
      'my-requests-category',
      'my-requests',
      'new-request',
      'requests-category',
      'request-list',
    ]);
  });

  it('keeps user creation inside Users instead of adding a separate sidebar entry', () => {
    const user = createUser({
      platformPermissions: [],
      organizationPermissions: ['dashboard.view', 'users.view', 'users.create'],
      departmentPermissions: {},
    });

    expect(getVisibleItemIds(user, 'available')).toEqual([
      'dashboard',
      'dashboard-user-statistics',
      'users',
    ]);
  });

  it('hides navigation until authorization is available and for an empty profile', () => {
    const emptyUser = createUser({
      platformPermissions: [],
      organizationPermissions: [],
      departmentPermissions: {},
    });

    expect(getVisibleNavigation(emptyUser, 'loading')).toEqual([]);
    expect(getVisibleNavigation(emptyUser, 'unavailable')).toEqual([]);
    expect(getVisibleItemIds(emptyUser, 'available')).toEqual([]);
  });
});
