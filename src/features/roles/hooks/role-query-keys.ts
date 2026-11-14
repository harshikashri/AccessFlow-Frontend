import type { RoleListParams } from '@/features/roles/types/role.types';

export const roleQueryKeys = {
  all: ['roles'] as const,
  workspace: (actorId: string, organizationId: string) =>
    [...roleQueryKeys.all, actorId, organizationId] as const,
  list: (actorId: string, organizationId: string, params: RoleListParams) =>
    [...roleQueryKeys.workspace(actorId, organizationId), 'list', params] as const,
  details: (actorId: string, organizationId: string, roleId: string) =>
    [...roleQueryKeys.workspace(actorId, organizationId), 'detail', roleId] as const,
  permissionCatalog: (actorId: string, organizationId: string) =>
    [...roleQueryKeys.workspace(actorId, organizationId), 'permission-catalog'] as const,
  users: (actorId: string, organizationId: string, roleId: string, page: number, limit: number) =>
    [...roleQueryKeys.workspace(actorId, organizationId), 'users', roleId, page, limit] as const,
};
