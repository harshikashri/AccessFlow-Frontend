import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys } from '@/features/dashboard/hooks/dashboard-query-keys';
import { departmentService } from '@/features/departments/services/department.service';
import type {
  CreateDepartmentRequest,
  DepartmentListParams,
  DepartmentStatus,
  UpdateDepartmentRequest,
} from '@/features/departments/types/department.types';
import { departmentQueryKeys } from './department-query-keys';

async function invalidateDepartmentData(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  organizationId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: departmentQueryKeys.user(userId, organizationId),
    }),
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.user(userId) }),
  ]);
}

export function useDepartmentList(
  userId: string,
  organizationId: string,
  params: DepartmentListParams,
) {
  return useQuery({
    queryKey: departmentQueryKeys.list(userId, organizationId, params),
    queryFn: ({ signal }) => departmentService.list(params, signal),
    enabled: userId.length > 0 && organizationId.length > 0,
  });
}

export function useDepartmentDetails(
  userId: string,
  organizationId: string,
  departmentId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: departmentQueryKeys.details(userId, organizationId, departmentId),
    queryFn: () => departmentService.get(departmentId),
    enabled: enabled && userId.length > 0 && organizationId.length > 0,
  });
}

export function useDepartmentManagerCandidates(
  userId: string,
  organizationId: string,
  departmentId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: departmentQueryKeys.managerCandidates(userId, organizationId, departmentId),
    queryFn: () => departmentService.listManagerCandidates(departmentId),
    enabled: enabled && userId.length > 0 && organizationId.length > 0,
  });
}

export function useCreateDepartment(userId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDepartmentRequest) => departmentService.create(payload),
    onSuccess: () => invalidateDepartmentData(queryClient, userId, organizationId),
  });
}

export function useUpdateDepartment(userId: string, organizationId: string, departmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDepartmentRequest) =>
      departmentService.update(departmentId, payload),
    onSuccess: () => invalidateDepartmentData(queryClient, userId, organizationId),
  });
}

export function useSetDepartmentStatus(
  userId: string,
  organizationId: string,
  departmentId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: DepartmentStatus) => departmentService.setStatus(departmentId, status),
    onSuccess: () => invalidateDepartmentData(queryClient, userId, organizationId),
  });
}

export function useReplaceDepartmentManagers(
  userId: string,
  organizationId: string,
  departmentId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (managerIds: string[]) =>
      departmentService.replaceManagers(departmentId, managerIds),
    onSuccess: () => invalidateDepartmentData(queryClient, userId, organizationId),
  });
}
