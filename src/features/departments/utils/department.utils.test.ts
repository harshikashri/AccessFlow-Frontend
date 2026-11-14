import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import {
  canEditDepartment,
  canViewDepartment,
  formatDepartmentDate,
  isDepartmentId,
  validateDepartmentForm,
} from '@/features/departments/utils/department.utils';

const departmentId = '64b000000000000000000001';
const otherDepartmentId = '64b000000000000000000002';

function createUser(
  organizationPermissions: AuthenticatedUser['authorization']['organizationPermissions'],
  departmentPermissions: AuthenticatedUser['authorization']['departmentPermissions'],
): AuthenticatedUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole: null,
    organizationId: '64b000000000000000000010',
    authorization: {
      platformPermissions: [],
      organizationPermissions,
      departmentPermissions,
    },
  };
}

describe('department utilities', () => {
  it('validates ObjectIds and bounds department form fields', () => {
    expect(isDepartmentId(departmentId)).toBe(true);
    expect(isDepartmentId('invalid')).toBe(false);
    expect(validateDepartmentForm({ name: 'A', description: 'x'.repeat(1001) })).toEqual({
      name: 'Department name must be between 2 and 200 characters.',
      description: 'Description cannot exceed 1000 characters.',
    });
    expect(validateDepartmentForm({ name: 'Engineering', description: '' })).toEqual({});
  });

  it('keeps organization and department edit scopes separate', () => {
    const user = createUser([], {
      [departmentId]: ['departments.view', 'departments.edit'],
    });

    expect(canViewDepartment(user, departmentId)).toBe(true);
    expect(canEditDepartment(user, departmentId)).toBe(true);
    expect(canViewDepartment(user, otherDepartmentId)).toBe(false);
    expect(canEditDepartment(user, otherDepartmentId)).toBe(false);
  });

  it('allows organization permissions without widening a custom department-only grant', () => {
    const orgAdmin = createUser(['departments.view', 'departments.edit'], {});
    const departmentUser = createUser([], {
      [departmentId]: ['departments.view'],
    });

    expect(canEditDepartment(orgAdmin, otherDepartmentId)).toBe(true);
    expect(canEditDepartment(departmentUser, departmentId)).toBe(false);
    expect(formatDepartmentDate('not-a-date')).toBe('—');
  });
});
