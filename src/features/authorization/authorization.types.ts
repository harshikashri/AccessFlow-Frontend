import type { PermissionId } from './permission-catalog';

export interface AuthorizationInfo {
  platformPermissions: string[];
  organizationPermissions: PermissionId[];
  departmentPermissions: Record<string, PermissionId[]>;
}

export type PermissionScope =
  'platform' | 'organization' | 'department' | 'organization-or-department';
