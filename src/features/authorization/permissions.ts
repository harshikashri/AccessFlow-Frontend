import type { AuthorizationInfo, PermissionScope } from './authorization.types';
import { PERMISSION_IDS } from './permission-catalog';
import type { PermissionId } from './permission-catalog';

const permissionIdSet: ReadonlySet<string> = new Set(PERMISSION_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isPermissionArray(value: unknown): value is PermissionId[] {
  return (
    Array.isArray(value) &&
    value.every(
      (permission) => typeof permission === 'string' && permissionIdSet.has(permission),
    ) &&
    new Set(value).size === value.length
  );
}

export function isAuthorizationInfo(value: unknown): value is AuthorizationInfo {
  if (!isRecord(value) || !Array.isArray(value.platformPermissions)) {
    return false;
  }

  if (value.platformPermissions.length !== 0 || !isPermissionArray(value.organizationPermissions)) {
    return false;
  }

  if (!isRecord(value.departmentPermissions)) {
    return false;
  }

  return Object.entries(value.departmentPermissions).every(
    ([departmentId, permissions]) =>
      /^[a-f\d]{24}$/i.test(departmentId) &&
      isPermissionArray(permissions) &&
      permissions.length > 0,
  );
}

export function hasPlatformPermission(
  authorization: AuthorizationInfo | null | undefined,
  permission: string,
): boolean {
  return (
    isAuthorizationInfo(authorization) && authorization.platformPermissions.includes(permission)
  );
}

export function hasOrganizationPermission(
  authorization: AuthorizationInfo | null | undefined,
  permission: PermissionId,
): boolean {
  return (
    isAuthorizationInfo(authorization) && authorization.organizationPermissions.includes(permission)
  );
}

export function hasDepartmentPermission(
  authorization: AuthorizationInfo | null | undefined,
  permission: PermissionId,
  departmentId: string,
): boolean {
  return (
    isAuthorizationInfo(authorization) &&
    typeof departmentId === 'string' &&
    (authorization.departmentPermissions[departmentId]?.includes(permission) ?? false)
  );
}

export function hasPermission(
  authorization: AuthorizationInfo | null | undefined,
  permission: PermissionId,
  scope: PermissionScope,
  departmentId?: string,
): boolean {
  if (scope === 'platform') {
    return hasPlatformPermission(authorization, permission);
  }
  if (scope === 'organization') {
    return hasOrganizationPermission(authorization, permission);
  }
  if (scope === 'department') {
    return departmentId ? hasDepartmentPermission(authorization, permission, departmentId) : false;
  }
  return (
    hasOrganizationPermission(authorization, permission) ||
    (isAuthorizationInfo(authorization) &&
      Object.keys(authorization.departmentPermissions).some((id) =>
        hasDepartmentPermission(authorization, permission, id),
      ))
  );
}

export function hasAnyPermission(
  authorization: AuthorizationInfo | null | undefined,
  permissions: readonly PermissionId[],
  scope: PermissionScope,
  departmentId?: string,
): boolean {
  return permissions.some((permission) =>
    hasPermission(authorization, permission, scope, departmentId),
  );
}

export function hasAllPermissions(
  authorization: AuthorizationInfo | null | undefined,
  permissions: readonly PermissionId[],
  scope: PermissionScope,
  departmentId?: string,
): boolean {
  if (permissions.length === 0) return false;
  if (scope === 'organization-or-department') {
    if (hasAllPermissions(authorization, permissions, 'organization')) return true;
    if (!isAuthorizationInfo(authorization)) return false;
    return Object.keys(authorization.departmentPermissions).some((id) =>
      hasAllPermissions(authorization, permissions, 'department', id),
    );
  }
  return permissions.every((permission) =>
    hasPermission(authorization, permission, scope, departmentId),
  );
}
