import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { getVisibleNavigation } from '@/features/authorization/navigation';
import type { AuthorizationInfo } from '@/features/authorization/authorization.types';

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
  const visit = (items: readonly { id: string; children?: readonly { id: string }[] }[]) =>
    items.flatMap((item) => [item.id, ...(item.children?.map((child) => child.id) ?? [])]);
  return getVisibleNavigation(user, status).flatMap((section) => visit(section.items));
}

describe('permission-aware navigation', () => {
  it('shows only platform workspaces for a Super Admin session', () => {
    const user = createUser(
      { platformPermissions: [], organizationPermissions: [], departmentPermissions: {} },
      'SUPER_ADMIN',
    );

    expect(getVisibleItemIds(user, 'available')).toEqual(['platform-dashboard', 'organizations']);
  });

  it('filters organization navigation by the exact granted permissions', () => {
    const user = createUser({
      platformPermissions: [],
      organizationPermissions: ['dashboard.view', 'roles.view', 'workflows.view'],
      departmentPermissions: {},
    });

    expect(getVisibleItemIds(user, 'available')).toEqual(['dashboard', 'roles', 'workflows']);
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
      'request-list',
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
    expect(getVisibleNavigation(emptyUser, 'available')).toEqual([]);
  });
});
