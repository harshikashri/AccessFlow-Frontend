import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type { PermissionCatalogResponse } from '@/features/roles/types/role.types';
import { RoleCreatePage } from '@/features/roles/pages/RoleCreatePage';

const rolePageMocks = vi.hoisted(() => ({
  permissionCatalog: vi.fn(),
  createRole: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock('@/features/roles/hooks/useRoles', () => ({
  usePermissionCatalog: rolePageMocks.permissionCatalog,
  useCreateRole: rolePageMocks.createRole,
}));

const user: AuthenticatedUser = {
  id: 'organization-admin-1',
  name: 'Organization Admin',
  email: 'admin@example.com',
  platformRole: null,
  organizationId: 'organization-1',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['roles.create'],
    departmentPermissions: {},
  },
};

const permissionCatalog: PermissionCatalogResponse = {
  modules: [
    {
      id: 'requests',
      name: 'Request Management',
      permissions: [
        {
          id: 'requests.create',
          name: 'Create requests',
          description: 'Create requests.',
        },
        {
          id: 'requests.view',
          name: 'View requests',
          description: 'View requests.',
        },
      ],
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      permissions: [
        {
          id: 'dashboard.view',
          name: 'View dashboard',
          description: 'View dashboard.',
        },
      ],
    },
  ],
};

function authContext(): AuthContextValue {
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

describe('RoleCreatePage', () => {
  beforeEach(() => {
    rolePageMocks.permissionCatalog.mockReturnValue({
      isPending: false,
      isError: false,
      data: permissionCatalog,
    });
    rolePageMocks.createRole.mockReturnValue({
      isPending: false,
      mutateAsync: rolePageMocks.mutateAsync,
    });
  });

  it('defaults new custom roles to request creation and dashboard access, with both configurable', () => {
    render(
      <ToastProvider>
        <AuthContext.Provider value={authContext()}>
          <MemoryRouter>
            <RoleCreatePage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand Request Management permissions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expand Dashboard permissions' }));

    const createRequests = screen.getByRole('checkbox', { name: 'Create requests' });
    const viewRequests = screen.getByRole('checkbox', { name: 'View requests' });
    const viewDashboard = screen.getByRole('checkbox', { name: 'View dashboard' });
    expect((createRequests as HTMLInputElement).checked).toBe(true);
    expect((viewRequests as HTMLInputElement).checked).toBe(false);
    expect((viewDashboard as HTMLInputElement).checked).toBe(true);

    fireEvent.click(createRequests);
    fireEvent.click(viewDashboard);

    expect((createRequests as HTMLInputElement).checked).toBe(false);
    expect((viewDashboard as HTMLInputElement).checked).toBe(false);
  });
});
