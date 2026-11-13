import { describe, expect, it } from 'vitest';
import type { AuthorizationInfo } from '@/features/authorization/authorization.types';
import {
  hasAllPermissions,
  hasDepartmentPermission,
  hasOrganizationPermission,
  isAuthorizationInfo,
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

  it('keeps organization and department grants separate', () => {
    expect(hasOrganizationPermission(authorization, 'users.view')).toBe(true);
    expect(hasOrganizationPermission(authorization, 'requests.approve')).toBe(false);
    expect(hasDepartmentPermission(authorization, 'requests.approve', departmentId)).toBe(true);
    expect(hasDepartmentPermission(authorization, 'requests.approve', otherDepartmentId)).toBe(
      false,
    );
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
