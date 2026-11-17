import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserFilters } from '@/features/users/components/UserFilters';
import type { Department } from '@/features/departments/types/department.types';
import type { UserRole } from '@/features/users/types/user.types';

const department: Department = {
  id: '64b000000000000000000001',
  organizationId: '64b000000000000000000002',
  name: 'Engineering',
  description: '',
  status: 'ACTIVE',
  managerCount: 0,
  memberCount: 0,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const role: UserRole = {
  id: '64b000000000000000000003',
  organizationId: department.organizationId,
  name: 'Finance Approver',
  description: '',
  roleType: 'FINANCE_APPROVER',
  rolePurpose: 'FINANCE_APPROVER',
  permissions: ['requests.approve'],
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

function renderFilters(overrides: Partial<ComponentProps<typeof UserFilters>> = {}) {
  const callbacks = {
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onDepartmentChange: vi.fn(),
    onRoleChange: vi.fn(),
    onSortByChange: vi.fn(),
    onClear: vi.fn(),
  };
  render(
    <UserFilters
      search=""
      status=""
      departmentId=""
      roleId=""
      sortBy="createdAt"
      departments={[department]}
      roles={[role]}
      departmentsLoading={false}
      rolesLoading={false}
      hasFilters={false}
      {...callbacks}
      {...overrides}
    />,
  );
  return callbacks;
}

describe('UserFilters', () => {
  it('passes account, department, role, sort, and search selections to the directory query state', async () => {
    const user = userEvent.setup();
    const callbacks = renderFilters();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search users' }), {
      target: { value: 'Taylor' },
    });
    await user.selectOptions(screen.getByLabelText('Account status'), 'INACTIVE');
    await user.selectOptions(screen.getByLabelText('Department'), 'null');
    await user.selectOptions(screen.getByLabelText('Role'), role.id);
    await user.selectOptions(screen.getByLabelText('Sort by'), 'email');

    expect(callbacks.onSearchChange).toHaveBeenLastCalledWith('Taylor');
    expect(callbacks.onStatusChange).toHaveBeenCalledWith('INACTIVE');
    expect(callbacks.onDepartmentChange).toHaveBeenCalledWith('null');
    expect(callbacks.onRoleChange).toHaveBeenCalledWith(role.id);
    expect(callbacks.onSortByChange).toHaveBeenCalledWith('email');
    expect(screen.queryByLabelText('Sort order')).toBeNull();
  });

  it('disables unavailable optional filters and explains how to retry them', () => {
    renderFilters({
      departmentFilterError: 'Department filtering is unavailable.',
      roleFilterError: 'Role filtering requires organization-level role access.',
    });

    expect(screen.getByLabelText('Department')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Role')).toHaveProperty('disabled', true);
    expect(screen.getByText('Department filtering is unavailable.')).toBeTruthy();
    expect(
      screen.getByText('Role filtering requires organization-level role access.'),
    ).toBeTruthy();
  });

  it('can omit Department while keeping the Role dropdown available', async () => {
    const user = userEvent.setup();
    const callbacks = renderFilters({ hideDepartmentFilter: true });

    expect(screen.queryByLabelText('Department')).toBeNull();
    expect(screen.getByLabelText('Role')).toHaveProperty('disabled', false);
    await user.selectOptions(screen.getByLabelText('Role'), role.id);
    expect(callbacks.onRoleChange).toHaveBeenCalledWith(role.id);
  });

  it('disables reference filters while options are loading', () => {
    renderFilters({ departmentsLoading: true, rolesLoading: true });

    expect(screen.getByLabelText('Department')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Role')).toHaveProperty('disabled', true);
    expect(screen.getByText('Loading departments…')).toBeTruthy();
    expect(screen.getByText('Loading roles…')).toBeTruthy();
  });
});
