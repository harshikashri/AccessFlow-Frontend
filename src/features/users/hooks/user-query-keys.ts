import type { UserListParams } from '@/features/users/types/user.types';
import type { DepartmentStatus } from '@/features/departments/types/department.types';

export const userQueryKeys = {
  all: ['users'] as const,
  workspace: (userId: string, organizationId: string) =>
    [...userQueryKeys.all, userId, organizationId] as const,
  list: (userId: string, organizationId: string, params: UserListParams) =>
    [...userQueryKeys.workspace(userId, organizationId), 'list', params] as const,
  details: (userId: string, organizationId: string, targetUserId: string) =>
    [...userQueryKeys.workspace(userId, organizationId), 'detail', targetUserId] as const,
  roleCatalog: (userId: string, organizationId: string) =>
    [...userQueryKeys.workspace(userId, organizationId), 'role-catalog'] as const,
  roleAssignments: (userId: string, organizationId: string, targetUserId: string) =>
    [...userQueryKeys.workspace(userId, organizationId), 'role-assignments', targetUserId] as const,
  departmentOptions: (userId: string, organizationId: string, status?: DepartmentStatus) =>
    [...userQueryKeys.workspace(userId, organizationId), 'department-options', status] as const,
};
