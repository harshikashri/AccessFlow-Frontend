import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type { ManagedRole } from '@/features/roles/types/role.types';
import { RoleListPage } from '@/features/roles/pages/RoleListPage';

const serviceMocks = vi.hoisted(() => ({
  list: vi.fn(),
  assign: vi.fn(),
}));

vi.mock('@/features/roles/services/role.service', () => ({
  roleService: { list: serviceMocks.list },
}));

vi.mock('@/features/users/services/user-role.service', () => ({
  userRoleService: { assign: serviceMocks.assign },
}));

vi.mock('@/features/roles/components/RoleAssignmentDialog', () => ({
  RoleAssignmentDialog: ({ open, role }: { open: boolean; role: ManagedRole }) =>
    open ? <div role="dialog" aria-label={`Assign ${role.name}`} /> : null,
}));

const user: AuthenticatedUser = {
  id: 'organization-admin-1',
  name: 'Organization Admin',
  email: 'admin@example.com',
  platformRole: null,
  organizationId: 'organization-1',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['roles.view', 'roles.edit', 'roles.create'],
    departmentPermissions: {},
  },
};

const activeRole: ManagedRole = {
  id: 'role-active',
  organizationId: user.organizationId ?? '',
  name: 'Project Viewer',
  description: 'Read project data.',
  roleType: 'CUSTOM',
  rolePurpose: 'GENERAL',
  permissions: [],
  status: 'ACTIVE',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
  createdBy: null,
  assignmentCount: 0,
};

const inactiveRole: ManagedRole = {
  ...activeRole,
  id: 'role-inactive',
  name: 'Archived Viewer',
  status: 'INACTIVE',
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={authContext()}>
          <MemoryRouter>
            <RoleListPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  serviceMocks.list.mockReset().mockResolvedValue({
    items: [activeRole, inactiveRole],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
  serviceMocks.assign.mockReset().mockResolvedValue(undefined);
});

describe('RoleListPage', () => {
  it('lets an admin choose an active role beside Create role and start assignment', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('link', { name: 'Project Viewer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create role' })).toBeTruthy();
    expect(
      screen.queryByText(
        'Manage organization role definitions and the permissions assigned to them.',
      ),
    ).toBeNull();
    expect(
      screen.queryByText(
        'Roles are scoped to this organization. Use the supported search, status, and sort controls to find a role.',
      ),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Assign role' }));

    expect(await screen.findByRole('dialog', { name: 'Select a role to assign' })).toBeTruthy();
    const roleSelect = screen.getByLabelText('Role');
    expect(screen.getByRole('option', { name: 'Project Viewer' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Archived Viewer' })).toBeNull();

    await user.selectOptions(roleSelect, activeRole.id);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('dialog', { name: 'Assign Project Viewer' })).toBeTruthy();
  });
});
