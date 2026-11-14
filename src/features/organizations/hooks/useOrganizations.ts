import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys } from '@/features/dashboard/hooks/dashboard-query-keys';
import { organizationService } from '@/features/organizations/services/organization.service';
import type {
  CreateOrganizationRequest,
  OrganizationListParams,
  OrganizationStatus,
  UpdateOrganizationRequest,
} from '@/features/organizations/types/organization.types';
import { organizationQueryKeys } from './organization-query-keys';

const summaryParams: OrganizationListParams[] = [
  { page: 1, limit: 1, search: '', sortBy: 'createdAt', sortOrder: 'desc' },
  { page: 1, limit: 1, search: '', status: 'ACTIVE', sortBy: 'createdAt', sortOrder: 'desc' },
  { page: 1, limit: 1, search: '', status: 'INACTIVE', sortBy: 'createdAt', sortOrder: 'desc' },
];

async function invalidateOrganizationData(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: organizationQueryKeys.user(userId) }),
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.user(userId) }),
  ]);
}

export function useOrganizationList(userId: string, params: OrganizationListParams) {
  return useQuery({
    queryKey: organizationQueryKeys.list(userId, params),
    queryFn: () => organizationService.list(params),
    enabled: userId.length > 0,
  });
}

export function useOrganizationDetails(userId: string, organizationId: string) {
  return useQuery({
    queryKey: organizationQueryKeys.details(userId, organizationId),
    queryFn: () => organizationService.get(organizationId),
    enabled: userId.length > 0 && organizationId.length > 0,
  });
}

export function useOrganizationSummary(userId: string) {
  const queries = useQueries({
    queries: summaryParams.map((params) => ({
      queryKey: organizationQueryKeys.list(userId, params),
      queryFn: () => organizationService.list(params),
      enabled: userId.length > 0,
    })),
  });
  const [totalQuery, activeQuery, inactiveQuery] = queries;

  return {
    counts:
      totalQuery?.data && activeQuery?.data && inactiveQuery?.data
        ? {
            total: totalQuery.data.pagination.total,
            active: activeQuery.data.pagination.total,
            inactive: inactiveQuery.data.pagination.total,
          }
        : null,
    isPending: queries.some((query) => query.isPending),
    isFetching: queries.some((query) => query.isFetching),
    isError: queries.some((query) => query.isError),
    error: queries.find((query) => query.isError)?.error ?? null,
    refetch: async () => {
      await Promise.all(queries.map((query) => query.refetch()));
    },
  };
}

export function useCreateOrganization(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrganizationRequest) => organizationService.create(payload),
    onSuccess: () => invalidateOrganizationData(queryClient, userId),
  });
}

export function useUpdateOrganization(userId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateOrganizationRequest) =>
      organizationService.update(organizationId, payload),
    onSuccess: () => invalidateOrganizationData(queryClient, userId),
  });
}

export function useSetOrganizationStatus(userId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: OrganizationStatus) =>
      organizationService.setStatus(organizationId, status),
    onSuccess: () => invalidateOrganizationData(queryClient, userId),
  });
}
