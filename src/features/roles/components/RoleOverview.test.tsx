import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoleOverview } from '@/features/roles/components/RoleOverview';
import type { ManagedRole } from '@/features/roles/types/role.types';

const legacyRole: ManagedRole = {
  id: '64b000000000000000000040',
  organizationId: '64b000000000000000000020',
  name: 'Legacy Viewer',
  description: 'Read project data.',
  roleType: 'CUSTOM',
  rolePurpose: 'GENERAL',
  assignmentScope: null,
  permissions: ['users.view'],
  status: 'ACTIVE',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  createdBy: null,
  assignmentCount: 0,
};

describe('RoleOverview assignment scope', () => {
  it('marks a legacy custom role unconfigured and explains the required edit', () => {
    render(<RoleOverview role={legacyRole} />);

    expect(screen.getByText('Unconfigured')).toBeTruthy();
    expect(screen.getByText(/must be edited to choose supported assignment scopes/)).toBeTruthy();
    expect(screen.queryByText(/complete effective access/)).toBeNull();
    expect(screen.queryByText('Current organization')).toBeNull();
    expect(screen.queryByText(legacyRole.organizationId)).toBeNull();
  });
});
