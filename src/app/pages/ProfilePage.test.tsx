import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from '@/app/pages/ProfilePage';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useToast: vi.fn(),
}));

vi.mock('@/features/auth/context/useAuth', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('@/components/ui/useToast', () => ({
  useToast: mocks.useToast,
}));

const user: AuthenticatedUser = {
  id: 'organization-user-1',
  name: 'Organization Admin',
  email: 'admin@example.com',
  platformRole: null,
  organizationId: 'organization-1',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['dashboard.view'],
    departmentPermissions: {},
  },
};

beforeEach(() => {
  mocks.useAuth.mockReturnValue({
    user,
    refreshCurrentUser: vi.fn().mockResolvedValue(user),
  });
  mocks.useToast.mockReturnValue({ showToast: vi.fn() });
});

describe('ProfilePage', () => {
  it('shows profile details without platform role or organization context', () => {
    render(<ProfilePage />);

    expect(screen.getByText('Full name')).toBeTruthy();
    expect(screen.getByText('Organization Admin')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('admin@example.com')).toBeTruthy();
    expect(screen.queryByText('Platform role')).toBeNull();
    expect(screen.queryByText('Organization context')).toBeNull();
    expect(screen.getByText('Permissions')).toBeTruthy();
    expect(screen.getByText('dashboard.view')).toBeTruthy();
  });

  it('shows department permissions instead of exposing department scope identifiers', () => {
    const departmentScopedUser: AuthenticatedUser = {
      ...user,
      authorization: {
        ...user.authorization,
        departmentPermissions: {
          '64b000000000000000000001': ['requests.view', 'requests.approve'],
        },
      },
    };
    mocks.useAuth.mockReturnValueOnce({
      user: departmentScopedUser,
      refreshCurrentUser: vi.fn().mockResolvedValue(departmentScopedUser),
    });

    render(<ProfilePage />);

    expect(screen.getByText('dashboard.view, requests.view, requests.approve')).toBeTruthy();
    expect(screen.queryByText('64b000000000000000000001')).toBeNull();
    expect(screen.queryByText('Department permission scopes')).toBeNull();
  });

  it('lists permissions separately for each active role', () => {
    const combinedRoleUser: AuthenticatedUser = {
      ...user,
      authorization: {
        ...user.authorization,
        departmentPermissions: {
          '64b000000000000000000001': ['users.view'],
        },
        roleTypes: ['CUSTOM', 'EMPLOYEE'],
        rolePermissions: [
          {
            roleName: 'Department Member',
            roleType: 'EMPLOYEE',
            scopeType: 'DEPARTMENT',
            permissions: ['users.view'],
          },
          {
            roleName: 'Finance Reviewer',
            roleType: 'CUSTOM',
            scopeType: 'ORGANIZATION',
            permissions: ['requests.create', 'dashboard.view'],
          },
        ],
      },
    };
    mocks.useAuth.mockReturnValueOnce({
      user: combinedRoleUser,
      refreshCurrentUser: vi.fn().mockResolvedValue(combinedRoleUser),
    });

    render(<ProfilePage />);

    expect(screen.getByText('Permissions by role')).toBeTruthy();
    expect(screen.getByText('Department Member')).toBeTruthy();
    expect(screen.getByText('(Department scope)')).toBeTruthy();
    expect(screen.getByText('users.view')).toBeTruthy();
    expect(screen.getByText('Finance Reviewer')).toBeTruthy();
    expect(screen.getByText('(Organization scope)')).toBeTruthy();
    expect(screen.getByText('requests.create, dashboard.view')).toBeTruthy();
    expect(screen.queryByText('64b000000000000000000001')).toBeNull();
  });

  it('preserves platform details for Super Admins', () => {
    const superAdmin: AuthenticatedUser = {
      ...user,
      platformRole: 'SUPER_ADMIN',
      organizationId: null,
    };
    mocks.useAuth.mockReturnValueOnce({
      user: superAdmin,
      refreshCurrentUser: vi.fn().mockResolvedValue(superAdmin),
    });

    render(<ProfilePage />);

    expect(screen.getByText('Platform role')).toBeTruthy();
    expect(screen.getByText('Super Admin')).toBeTruthy();
    expect(screen.getByText('Organization context')).toBeTruthy();
    expect(screen.getByText('No organization context')).toBeTruthy();
  });
});
