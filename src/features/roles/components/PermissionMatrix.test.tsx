import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionMatrix } from '@/features/roles/components/PermissionMatrix';
import type { PermissionCatalogModule } from '@/features/roles/types/role.types';

const userModule: PermissionCatalogModule = {
  id: 'users',
  name: 'Users',
  permissions: [
    {
      id: 'users.view',
      name: 'View users',
      description: 'View users in the organization.',
    },
  ],
};

const departmentModule: PermissionCatalogModule = {
  id: 'departments',
  name: 'Departments',
  permissions: [
    {
      id: 'departments.view',
      name: 'View departments',
      description: 'View departments in the organization.',
    },
  ],
};

describe('PermissionMatrix', () => {
  it('renders independent collapsible categories when asynchronous catalog data arrives', () => {
    const { rerender } = render(<PermissionMatrix modules={[]} value={[]} />);

    rerender(<PermissionMatrix modules={[userModule, departmentModule]} value={[]} />);

    const userToggle = screen.getByRole('button', { name: 'Expand Users permissions' });
    const departmentToggle = screen.getByRole('button', {
      name: 'Expand Departments permissions',
    });
    expect(userToggle.getAttribute('aria-expanded')).toBe('false');
    expect(departmentToggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText('View users')).toBeNull();
    expect(screen.queryByLabelText('View departments')).toBeNull();

    fireEvent.click(userToggle);

    expect(screen.getByRole('button', { name: 'Collapse Users permissions' })).toBeTruthy();
    expect(screen.getByLabelText('View users')).toBeTruthy();
    expect(screen.queryByLabelText('View departments')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Departments permissions' })).toBeTruthy();
  });
});
