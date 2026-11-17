import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleAssignmentDialog } from '@/features/roles/components/RoleAssignmentDialog';
import type { ManagedRole } from '@/features/roles/types/role.types';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useUserDepartmentOptions: vi.fn(),
  useUserList: vi.fn(),
  useUserRoleAssignments: vi.fn(),
  canAssignRoleAtScope: vi.fn(),
  isDuplicateRoleAssignment: vi.fn(),
}));

vi.mock('@/features/auth/context/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/features/users/hooks/useUsers', () => ({
  useUserDepartmentOptions: mocks.useUserDepartmentOptions,
  useUserList: mocks.useUserList,
  useUserRoleAssignments: mocks.useUserRoleAssignments,
}));
vi.mock('@/features/users/utils/user.utils', () => ({
  canAssignRoleAtScope: mocks.canAssignRoleAtScope,
  isDuplicateRoleAssignment: mocks.isDuplicateRoleAssignment,
}));

const actor = {
  id: '64b000000000000000000010',
  name: 'Organization Admin',
  email: 'admin@example.com',
  platformRole: null,
  organizationId: '64b000000000000000000020',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['users.view', 'departments.view'],
    departmentPermissions: {},
  },
};

const candidate = {
  id: '64b000000000000000000030',
  name: 'Taylor User',
  email: 'taylor@example.com',
  accountStatus: 'ACTIVE' as const,
  membership: {
    membershipId: 'membership-1',
    organizationId: actor.organizationId,
    organizationStatus: 'ACTIVE' as const,
    departmentId: null,
    department: null,
    status: 'ACTIVE' as const,
  },
  roleAssignments: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const role: ManagedRole = {
  id: '64b000000000000000000040',
  organizationId: actor.organizationId,
  name: 'Project Viewer',
  description: 'Read project data.',
  roleType: 'CUSTOM',
  rolePurpose: 'GENERAL',
  permissions: [],
  status: 'ACTIVE',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  createdBy: null,
  assignmentCount: 0,
};

describe('RoleAssignmentDialog', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({ user: actor });
    mocks.useUserList.mockReturnValue({
      data: { users: [candidate], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
      isPending: false,
      isError: false,
    });
    mocks.useUserRoleAssignments.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useUserDepartmentOptions.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.canAssignRoleAtScope.mockReturnValue(true);
    mocks.isDuplicateRoleAssignment.mockReturnValue(false);
  });

  it('blocks submission when the existing-assignment check fails', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();
    mocks.useUserRoleAssignments.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Assignment lookup failed.'),
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RoleAssignmentDialog
          open
          role={role}
          isSaving={false}
          onOpenChange={vi.fn()}
          onAssign={onAssign}
        />
      </MemoryRouter>,
    );

    expect(
      screen.queryByText(
        'The backend validates active membership, the selected assignment scope, role compatibility, and your permission scope.',
      ),
    ).toBeNull();
    const userSearch = screen.getByRole('combobox', { name: 'Find a user' });
    await user.type(userSearch, 'Taylor');
    const candidateOption = await screen.findByRole('option', { name: /Taylor User/ });
    expect(userSearch.getAttribute('aria-expanded')).toBe('true');
    await user.click(candidateOption);
    expect(userSearch.getAttribute('aria-expanded')).toBe('false');

    expect(screen.getByText('Existing assignments could not be checked')).toBeTruthy();
    const assignButton = screen.getByRole('button', { name: 'Assign role' });
    expect(assignButton.hasAttribute('disabled')).toBe(true);
    await user.click(assignButton);
    expect(onAssign).not.toHaveBeenCalled();
  });

  it('uses the fixed department scope for the built-in Finance Approver role', () => {
    const financeRole: ManagedRole = {
      ...role,
      name: 'Finance Approver',
      roleType: 'FINANCE_APPROVER',
      rolePurpose: 'FINANCE_APPROVER',
    };

    render(
      <MemoryRouter>
        <RoleAssignmentDialog
          open
          role={financeRole}
          isSaving={false}
          onOpenChange={vi.fn()}
          onAssign={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Assignment scope: Department')).toBeTruthy();
  });

  it('explains why an unconfigured legacy custom role cannot be assigned', () => {
    render(
      <MemoryRouter>
        <RoleAssignmentDialog
          open
          role={role}
          isSaving={false}
          onOpenChange={vi.fn()}
          onAssign={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Assignment scope configuration required')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Configure role' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Assign role' }).hasAttribute('disabled')).toBe(true);
  });
});
