import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DepartmentMembers } from '@/features/departments/components/DepartmentMembers';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type { DepartmentUser } from '@/features/departments/types/department.types';

const departmentId = '64b000000000000000000001';
const member: DepartmentUser = {
  id: '64b000000000000000000002',
  name: 'Department Member',
  email: 'member@example.com',
  accountStatus: 'ACTIVE',
  membershipStatus: 'ACTIVE',
  membershipId: '64b000000000000000000003',
  departmentId,
};

function actor(
  permissions: AuthenticatedUser['authorization']['organizationPermissions'],
): AuthenticatedUser {
  return {
    id: '64b000000000000000000010',
    name: 'Scoped Viewer',
    email: 'viewer@example.com',
    platformRole: null,
    organizationId: '64b000000000000000000020',
    authorization: {
      platformPermissions: [],
      organizationPermissions: [],
      departmentPermissions: { [departmentId]: permissions },
    },
  };
}

describe('DepartmentMembers', () => {
  it('links members only when users.view is effective in their department', () => {
    const { rerender } = render(
      <MemoryRouter>
        <DepartmentMembers members={[member]} actor={actor(['users.view'])} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: member.name }).getAttribute('href')).toBe(
      `/users/${member.id}`,
    );

    rerender(
      <MemoryRouter>
        <DepartmentMembers members={[member]} actor={actor(['departments.view'])} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: member.name })).toBeNull();
    expect(screen.getByText(member.name)).toBeTruthy();
  });
});
