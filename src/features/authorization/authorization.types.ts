import type { PermissionId } from './permission-catalog';

export type AuthorizationRoleType =
  'ORGANIZATION_ADMIN' | 'DEPARTMENT_MANAGER' | 'EMPLOYEE' | 'FINANCE_APPROVER' | 'CUSTOM';

export interface RolePermissionSet {
  roleName: string;
  roleType: AuthorizationRoleType;
  scopeType: 'ORGANIZATION' | 'DEPARTMENT';
  permissions: PermissionId[];
}

export interface AuthorizationInfo {
  platformPermissions: string[];
  organizationPermissions: PermissionId[];
  departmentPermissions: Record<string, PermissionId[]>;
  roleTypes?: AuthorizationRoleType[];
  rolePermissions?: RolePermissionSet[];
}

export type PermissionScope =
  'platform' | 'organization' | 'department' | 'organization-or-department';
