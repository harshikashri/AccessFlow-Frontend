import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { UserRoleAssignments } from '@/features/users/components/UserRoleAssignments';
import type { UserRoleAssignment } from '@/features/users/types/user.types';

const actor: AuthenticatedUser = {
  id: '64b000000000000000000010',
  name: 'Organization Admin',
  email: 'admin@example.com',
  platformRole: null,
  organizationId: '64b000000000000000000020',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['roles.view'],
    departmentPermissions: {},
  },
};

const assignment: UserRoleAssignment = {
  id: '64b000000000000000000030',
  userId: '64b000000000000000000011',
  roleId: '64b000000000000000000040',
  roleName: 'Project Viewer',
  scopeType: 'ORGANIZATION',
  departmentId: null,
  status: 'ACTIVE',
  assignedBy: actor.id,
  assignedAt: '2025-01-01T00:00:00.000Z',
};

describe('UserRoleAssignments', () => {
  it('links an assigned role to its role details page', () => {
    render(
      <MemoryRouter>
        <UserRoleAssignments
          actor={actor}
          roles={[]}
          assignments={[assignment]}
          departments={[]}
          isLoading={false}
          loadError={null}
          canManage={false}
          isSaving={false}
          onRetry={vi.fn()}
          onAssign={vi.fn()}
          onRemove={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Project Viewer' }).getAttribute('href')).toBe(
      `/roles/${assignment.roleId}`,
    );
  });
});
