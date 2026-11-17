import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys } from '@/features/dashboard/hooks/dashboard-query-keys';
import { departmentQueryKeys } from '@/features/departments/hooks/department-query-keys';
import { userQueryKeys } from '@/features/users/hooks/user-query-keys';
import { userRoleService } from '@/features/users/services/user-role.service';
import type { UserRoleAssignmentRequest } from '@/features/users/types/user.types';
import type { UpdateUserRoleAssignmentRequest } from '@/features/users/types/user.types';
import { roleService } from '@/features/roles/services/role.service';
import type {
  CreateRoleRequest,
  RoleListParams,
  RoleStatus,
  UpdateRoleRequest,
} from '@/features/roles/types/role.types';
import type { PermissionId } from '@/features/authorization/permission-catalog';
import { roleQueryKeys } from './role-query-keys';

async function invalidateRoleData(
  queryClient: ReturnType<typeof useQueryClient>,
  actorId: string,
  organizationId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: roleQueryKeys.workspace(actorId, organizationId),
    }),
    queryClient.invalidateQueries({
      queryKey: userQueryKeys.workspace(actorId, organizationId),
    }),
    queryClient.invalidateQueries({
      queryKey: departmentQueryKeys.user(actorId, organizationId),
    }),
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.user(actorId) }),
  ]);
}

export function useRoleList(
  actorId: string,
  organizationId: string,
  params: RoleListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: roleQueryKeys.list(actorId, organizationId, params),
    queryFn: ({ signal }) => roleService.list(params, signal),
    enabled: enabled && actorId.length > 0 && organizationId.length > 0,
  });
}

export function useRoleDetails(
  actorId: string,
  organizationId: string,
  roleId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: roleQueryKeys.details(actorId, organizationId, roleId),
    queryFn: () => roleService.get(roleId),
    enabled: enabled && actorId.length > 0 && organizationId.length > 0 && roleId.length > 0,
  });
}

export function useRoleDetailsByIds(
  actorId: string,
  organizationId: string,
  roleIds: string[],
  enabled = true,
) {
  return useQueries({
    queries: [...new Set(roleIds)].map((roleId) => ({
      queryKey: roleQueryKeys.details(actorId, organizationId, roleId),
      queryFn: () => roleService.get(roleId),
      enabled: enabled && actorId.length > 0 && organizationId.length > 0,
    })),
  });
}

export function usePermissionCatalog(actorId: string, organizationId: string, enabled = true) {
  return useQuery({
    queryKey: roleQueryKeys.permissionCatalog(actorId, organizationId),
    queryFn: () => roleService.getPermissionCatalog(),
    enabled: enabled && actorId.length > 0 && organizationId.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoleUsers(
  actorId: string,
  organizationId: string,
  roleId: string,
  page: number,
  limit: number,
  enabled = true,
) {
  return useQuery({
    queryKey: roleQueryKeys.users(actorId, organizationId, roleId, page, limit),
    queryFn: () => roleService.listUsers(roleId, page, limit),
    enabled: enabled && actorId.length > 0 && organizationId.length > 0 && roleId.length > 0,
  });
}

export function useCreateRole(actorId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoleRequest) => roleService.create(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: roleQueryKeys.workspace(actorId, organizationId),
      }),
  });
}

export function useUpdateRole(actorId: string, organizationId: string, roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateRoleRequest) => roleService.update(roleId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: roleQueryKeys.workspace(actorId, organizationId),
      }),
  });
}

export function useUpdateRolePermissions(actorId: string, organizationId: string, roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissions: PermissionId[]) => roleService.updatePermissions(roleId, permissions),
    onSuccess: () => invalidateRoleData(queryClient, actorId, organizationId),
  });
}

export function useSetRoleStatus(actorId: string, organizationId: string, roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: RoleStatus) => roleService.setStatus(roleId, status),
    onSuccess: () => invalidateRoleData(queryClient, actorId, organizationId),
  });
}

export function useAssignRole(actorId: string, organizationId: string, roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserRoleAssignmentRequest) => userRoleService.assign(roleId, payload),
    onSuccess: () => invalidateRoleData(queryClient, actorId, organizationId),
  });
}

export function useRemoveRoleAssignment(actorId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      userId,
      scope,
    }: {
      roleId: string;
      userId: string;
      scope: { scopeType: 'ORGANIZATION' | 'DEPARTMENT'; departmentId?: string };
    }) => userRoleService.remove(roleId, userId, scope),
    onSuccess: () => invalidateRoleData(queryClient, actorId, organizationId),
  });
}

export function useUpdateRoleAssignment(actorId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      payload,
    }: {
      assignmentId: string;
      payload: UpdateUserRoleAssignmentRequest;
    }) => roleService.updateAssignment(assignmentId, payload),
    onSuccess: () => invalidateRoleData(queryClient, actorId, organizationId),
  });
}
