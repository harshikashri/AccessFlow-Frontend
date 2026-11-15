import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type { UserRole } from '@/features/users/types/user.types';
import {
  canAssignRoleAtScope,
  canAssignUserToDepartment,
  canEditUserScope,
  canViewUserScope,
  createUserPayload,
  getUserStatusLabel,
  isUserId,
  validateUserForm,
} from '@/features/users/utils/user.utils';
import type { UserFormValues } from '@/features/users/types/user.types';

const departmentId = '64b000000000000000000001';
const otherDepartmentId = '64b000000000000000000002';

function createActor(
  organizationPermissions: AuthenticatedUser['authorization']['organizationPermissions'],
  departmentPermissions: AuthenticatedUser['authorization']['departmentPermissions'],
): AuthenticatedUser {
  return {
    id: '64b000000000000000000010',
    name: 'Scoped user',
    email: 'scoped@example.com',
    platformRole: null,
    organizationId: '64b000000000000000000020',
    authorization: {
      platformPermissions: [],
      organizationPermissions,
      departmentPermissions,
    },
  };
}

describe('user utilities', () => {
  it('keeps department view and edit permissions restricted to the assigned scope', () => {
    const actor = createActor([], {
      [departmentId]: ['users.view', 'users.edit'],
    });

    expect(isUserId(departmentId)).toBe(true);
    expect(isUserId('not-an-id')).toBe(false);
    expect(canViewUserScope(actor, departmentId)).toBe(true);
    expect(canEditUserScope(actor, departmentId)).toBe(true);
    expect(canViewUserScope(actor, otherDepartmentId)).toBe(false);
    expect(canAssignUserToDepartment(actor, departmentId, otherDepartmentId)).toBe(false);
    expect(canAssignUserToDepartment(actor, departmentId, null)).toBe(true);
  });

  it('omits null department IDs from organization role assignment API payloads', () => {
    const values: UserFormValues = {
      name: 'Taylor User',
      email: 'TAYLOR@example.com',
      departmentId: '',
      roleAssignments: [{ roleId: departmentId, scopeType: 'ORGANIZATION', departmentId: null }],
    };

    expect(createUserPayload(values)).toEqual({
      name: 'Taylor User',
      email: 'taylor@example.com',
      roleAssignments: [{ roleId: departmentId, scopeType: 'ORGANIZATION' }],
    });
  });

  it('validates form bounds and distinguishes pending setup from account state', () => {
    expect(
      validateUserForm({
        name: 'A',
        email: 'invalid',
        departmentId: '',
        roleAssignments: [],
      }),
    ).toEqual({
      name: 'Name must be between 2 and 200 characters.',
      email: 'Enter a valid email address.',
    });
    expect(getUserStatusLabel('INACTIVE', true)).toBe('Setup pending');
    expect(getUserStatusLabel('INACTIVE')).toBe('Account inactive');
  });

  it('allows Finance Approver purpose roles at every configured scope', () => {
    const actor = createActor(['requests.approve'], {});
    const financeRole: UserRole = {
      id: otherDepartmentId,
      organizationId: actor.organizationId ?? '',
      name: 'Finance Approver',
      description: '',
      roleType: 'CUSTOM' as const,
      rolePurpose: 'FINANCE_APPROVER' as const,
      assignmentScope: null,
      assignmentScopes: ['ORGANIZATION', 'DEPARTMENT'],
      permissions: ['requests.approve'],
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
    };

    expect(canAssignRoleAtScope(actor, financeRole, 'ORGANIZATION', null)).toBe(true);
    expect(canAssignRoleAtScope(actor, financeRole, 'DEPARTMENT', departmentId)).toBe(true);
  });

  it('only assigns configured custom roles at a supported scope', () => {
    const actor = createActor(['users.view'], {});
    const customRole: UserRole = {
      id: otherDepartmentId,
      organizationId: actor.organizationId ?? '',
      name: 'Project Viewer',
      description: '',
      roleType: 'CUSTOM',
      rolePurpose: 'GENERAL',
      assignmentScope: 'DEPARTMENT',
      permissions: ['users.view'],
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
    };

    expect(canAssignRoleAtScope(actor, customRole, 'ORGANIZATION', null)).toBe(false);
    expect(canAssignRoleAtScope(actor, customRole, 'DEPARTMENT', departmentId)).toBe(true);
    expect(
      canAssignRoleAtScope(
        actor,
        { ...customRole, assignmentScope: null },
        'DEPARTMENT',
        departmentId,
      ),
    ).toBe(false);
  });
});
