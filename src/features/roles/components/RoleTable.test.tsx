import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RoleTable } from '@/features/roles/components/RoleTable';
import type { ManagedRole } from '@/features/roles/types/role.types';

const role: ManagedRole = {
  id: '64b000000000000000000040',
  organizationId: '64b000000000000000000020',
  name: 'Project Viewer',
  description: 'Read project data.',
  roleType: 'CUSTOM',
  rolePurpose: 'GENERAL',
  permissions: ['users.view'],
  status: 'ACTIVE',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  createdBy: null,
  assignmentCount: 3,
};

describe('RoleTable', () => {
  it('labels the backend assignment-record count accurately', () => {
    render(
      <MemoryRouter>
        <RoleTable roles={[role]} isLoading={false} canEdit={false} hasFilters={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('columnheader', { name: 'Active assignments' })).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
