import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys } from '@/features/dashboard/hooks/dashboard-query-keys';
import { departmentQueryKeys } from '@/features/departments/hooks/department-query-keys';
import { userReferenceService } from '@/features/users/services/user-reference.service';
import { userRoleService } from '@/features/users/services/user-role.service';
import { userService } from '@/features/users/services/user.service';
import type {
  AssignUserDepartmentRequest,
  CreateUserRequest,
  RemoveUserRoleAssignmentRequest,
  UserListParams,
  UserRoleAssignmentRequest,
  UserStatus,
  UpdateUserRequest,
} from '@/features/users/types/user.types';
import type { DepartmentStatus } from '@/features/departments/types/department.types';
import { userQueryKeys } from './user-query-keys';
import { roleQueryKeys } from '@/features/roles/hooks/role-query-keys';

async function invalidateUserWorkspace(
  queryClient: ReturnType<typeof useQueryClient>,
  actorId: string,
  organizationId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: userQueryKeys.workspace(actorId, organizationId),
    }),
    queryClient.invalidateQueries({
      queryKey: roleQueryKeys.workspace(actorId, organizationId),
    }),
    queryClient.invalidateQueries({
      queryKey: departmentQueryKeys.user(actorId, organizationId),
    }),
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.user(actorId) }),
  ]);
}

export function useUserList(
  actorId: string,
  organizationId: string,
  params: UserListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: userQueryKeys.list(actorId, organizationId, params),
    queryFn: () => userService.list(params),
    enabled: enabled && actorId.length > 0 && organizationId.length > 0,
  });
}

export function useUserDetails(
  actorId: string,
  organizationId: string,
  targetUserId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: userQueryKeys.details(actorId, organizationId, targetUserId),
    queryFn: () => userService.get(targetUserId),
    enabled: enabled && actorId.length > 0 && organizationId.length > 0 && targetUserId.length > 0,
  });
}

export function useUserRoleCatalog(actorId: string, organizationId: string, enabled: boolean) {
  return useQuery({
    queryKey: userQueryKeys.roleCatalog(actorId, organizationId),
    queryFn: () => userRoleService.listActiveRoles(),
    enabled: enabled && actorId.length > 0 && organizationId.length > 0,
  });
}

export function useUserRoleAssignments(
  actorId: string,
  organizationId: string,
  targetUserId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: userQueryKeys.roleAssignments(actorId, organizationId, targetUserId),
    queryFn: () => userRoleService.listAssignments(targetUserId),
    enabled: enabled && actorId.length > 0 && organizationId.length > 0 && targetUserId.length > 0,
  });
}

export function useUserDepartmentOptions(
  actorId: string,
  organizationId: string,
  enabled: boolean,
  status?: DepartmentStatus,
) {
  return useQuery({
    queryKey: userQueryKeys.departmentOptions(actorId, organizationId, status),
    queryFn: () => userReferenceService.listDepartments(status),
    enabled: enabled && actorId.length > 0 && organizationId.length > 0,
  });
}

export function useCreateUser(actorId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserRequest) => userService.create(payload),
    onSuccess: () => invalidateUserWorkspace(queryClient, actorId, organizationId),
  });
}

export function useUpdateUser(actorId: string, organizationId: string, targetUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserRequest) => userService.update(targetUserId, payload),
    onSuccess: () => invalidateUserWorkspace(queryClient, actorId, organizationId),
  });
}

export function useAssignUserDepartment(
  actorId: string,
  organizationId: string,
  targetUserId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignUserDepartmentRequest) =>
      userService.assignDepartment(targetUserId, payload),
    onSuccess: () => invalidateUserWorkspace(queryClient, actorId, organizationId),
  });
}

export function useSetUserMembershipStatus(actorId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetUserId, status }: { targetUserId: string; status: UserStatus }) =>
      userService.setMembershipStatus(targetUserId, status),
    onSuccess: () => invalidateUserWorkspace(queryClient, actorId, organizationId),
  });
}

export function useSendUserPasswordInstructions(targetUserId: string) {
  return useMutation({
    mutationFn: () => userService.sendPasswordInstructions(targetUserId),
  });
}

export function useAssignUserRole(actorId: string, organizationId: string, targetUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      payload,
    }: {
      roleId: string;
      payload: Omit<UserRoleAssignmentRequest, 'userId'>;
    }) => userRoleService.assign(roleId, { ...payload, userId: targetUserId }),
    onSuccess: () => invalidateUserWorkspace(queryClient, actorId, organizationId),
  });
}

export function useRemoveUserRole(actorId: string, organizationId: string, targetUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      payload,
    }: {
      roleId: string;
      payload: RemoveUserRoleAssignmentRequest;
    }) => userRoleService.remove(roleId, targetUserId, payload),
    onSuccess: () => invalidateUserWorkspace(queryClient, actorId, organizationId),
  });
}
