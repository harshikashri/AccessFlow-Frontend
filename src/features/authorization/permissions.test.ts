import { describe, expect, it } from 'vitest';
import type { AuthorizationInfo } from '@/features/authorization/authorization.types';
import {
  hasAllPermissions,
  hasDepartmentPermission,
  hasOrganizationPermission,
  isAuthorizationInfo,
  isDepartmentMember,
} from '@/features/authorization/permissions';

const departmentId = '64b000000000000000000001';
const otherDepartmentId = '64b000000000000000000002';

const authorization: AuthorizationInfo = {
  platformPermissions: [],
  organizationPermissions: ['users.view'],
  departmentPermissions: {
    [departmentId]: ['requests.view', 'requests.approve'],
    [otherDepartmentId]: ['departments.view'],
  },
};

describe('authorization permissions', () => {
  it('validates known, unique permission identifiers and department scopes', () => {
    expect(isAuthorizationInfo(authorization)).toBe(true);
    expect(
      isAuthorizationInfo({
        ...authorization,
        organizationPermissions: ['users.view', 'users.view'],
      }),
    ).toBe(false);
    expect(
      isAuthorizationInfo({
        ...authorization,
        departmentPermissions: { finance: ['requests.approve'] },
      }),
    ).toBe(false);
    expect(
      isAuthorizationInfo({
        ...authorization,
        organizationPermissions: ['users.root'],
      }),
    ).toBe(false);
  });

  it('validates role-specific permission sets in the authorization response', () => {
    const roleAuthorization: AuthorizationInfo = {
      ...authorization,
      roleTypes: ['EMPLOYEE', 'CUSTOM'],
      rolePermissions: [
        {
          roleName: 'Department Member',
          roleType: 'EMPLOYEE',
          scopeType: 'DEPARTMENT',
          permissions: ['users.view'],
        },
        {
          roleName: 'Reviewer',
          roleType: 'CUSTOM',
          scopeType: 'ORGANIZATION',
          permissions: ['requests.create'],
        },
      ],
    };

    expect(isAuthorizationInfo(roleAuthorization)).toBe(true);
    expect(
      isAuthorizationInfo({
        ...roleAuthorization,
        rolePermissions: [
          {
            roleName: 'Reviewer',
            roleType: 'INVALID',
            scopeType: 'ORGANIZATION',
            permissions: ['requests.create'],
          },
        ],
      }),
    ).toBe(false);
  });

  it('keeps organization and department grants separate', () => {
    expect(hasOrganizationPermission(authorization, 'users.view')).toBe(true);
    expect(hasOrganizationPermission(authorization, 'requests.approve')).toBe(false);
    expect(hasDepartmentPermission(authorization, 'requests.approve', departmentId)).toBe(true);
    expect(hasDepartmentPermission(authorization, 'requests.approve', otherDepartmentId)).toBe(
      false,
    );
  });

  it('does not apply Department Member-only behavior when a custom role is also active', () => {
    const departmentMemberWithCustomRole: AuthorizationInfo = {
      ...authorization,
      roleTypes: ['EMPLOYEE', 'CUSTOM'],
    };

    expect(isDepartmentMember(departmentMemberWithCustomRole)).toBe(false);
    expect(
      isDepartmentMember({
        ...departmentMemberWithCustomRole,
        departmentPermissions: {
          ...departmentMemberWithCustomRole.departmentPermissions,
          [departmentId]: [
            'users.view',
            ...(departmentMemberWithCustomRole.departmentPermissions[departmentId] ?? []),
          ],
        },
        roleTypes: ['EMPLOYEE'],
      }),
    ).toBe(true);
  });

  it('requires all permissions in the same scope when scope is flexible', () => {
    expect(
      hasAllPermissions(
        authorization,
        ['users.view', 'requests.approve'],
        'organization-or-department',
      ),
    ).toBe(false);
    expect(
      hasAllPermissions(
        authorization,
        ['requests.view', 'requests.approve'],
        'organization-or-department',
      ),
    ).toBe(true);
    expect(
      hasAllPermissions(
        authorization,
        ['requests.view', 'departments.view'],
        'organization-or-department',
      ),
    ).toBe(false);
  });

  it('fails closed for missing authorization and empty permission requirements', () => {
    expect(hasOrganizationPermission(undefined, 'users.view')).toBe(false);
    expect(hasDepartmentPermission(authorization, 'requests.approve', '')).toBe(false);
    expect(hasAllPermissions(undefined, [], 'organization-or-department')).toBe(false);
  });
});
