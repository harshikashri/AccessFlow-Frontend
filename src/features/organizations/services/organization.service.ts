import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import type {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  Organization,
  OrganizationDetails,
  OrganizationListParams,
  OrganizationListResponse,
  OrganizationPagination,
  OrganizationStatus,
  UpdateOrganizationRequest,
} from '@/features/organizations/types/organization.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0;
}

function isOrganization(value: unknown): value is Organization {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.status === 'ACTIVE' || value.status === 'INACTIVE') &&
    (value.createdBy === null || typeof value.createdBy === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isOrganizationPagination(value: unknown): value is OrganizationPagination {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.page) &&
    isNonNegativeInteger(value.limit) &&
    isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.totalPages) &&
    typeof value.hasNextPage === 'boolean' &&
    typeof value.hasPreviousPage === 'boolean'
  );
}

function getApiData(response: AxiosResponse<unknown>): unknown {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The organization API returned an unsupported response.');
  }
  return response.data.data;
}

function assertApiData<T>(
  response: AxiosResponse<unknown>,
  isExpected: (value: unknown) => value is T,
): T {
  const data = getApiData(response);
  if (!isExpected(data)) {
    throw new Error('The organization API returned an unsupported response.');
  }
  return data;
}

function isOrganizationListResponse(value: unknown): value is OrganizationListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isOrganization) &&
    isOrganizationPagination(value.pagination)
  );
}

function isOrganizationDetails(value: unknown): value is OrganizationDetails {
  return (
    isRecord(value) &&
    isOrganization(value.organization) &&
    isRecord(value.summary) &&
    isNonNegativeInteger(value.summary.memberCount) &&
    isNonNegativeInteger(value.summary.activeMemberCount) &&
    isNonNegativeInteger(value.summary.departmentCount)
  );
}

function isCreateOrganizationResponse(value: unknown): value is CreateOrganizationResponse {
  return (
    isRecord(value) &&
    isOrganization(value.organization) &&
    isRecord(value.admin) &&
    typeof value.admin.id === 'string' &&
    typeof value.admin.name === 'string' &&
    typeof value.admin.email === 'string' &&
    (value.admin.accountStatus === 'ACTIVE' || value.admin.accountStatus === 'INACTIVE') &&
    (value.admin.platformRole === null || value.admin.platformRole === 'SUPER_ADMIN') &&
    (value.admin.organizationId === null || typeof value.admin.organizationId === 'string') &&
    isRecord(value.role) &&
    typeof value.role.id === 'string' &&
    typeof value.role.name === 'string'
  );
}

function toListParams(params: OrganizationListParams): Record<string, string> {
  return {
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    ...(params.status ? { status: params.status } : {}),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
}

export const organizationService = {
  async list(params: OrganizationListParams, signal?: AbortSignal): Promise<OrganizationListResponse> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/organizations', {
      params: toListParams(params),
      ...(signal ? { signal } : {}),
    });
    return assertApiData(response, isOrganizationListResponse);
  },

  async get(organizationId: string): Promise<OrganizationDetails> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/organizations/${encodeURIComponent(organizationId)}`,
    );
    return assertApiData(response, isOrganizationDetails);
  },

  async create(payload: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/organizations', payload);
    return assertApiData(response, isCreateOrganizationResponse);
  },

  async update(organizationId: string, payload: UpdateOrganizationRequest): Promise<Organization> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/organizations/${encodeURIComponent(organizationId)}`,
      payload,
    );
    return assertApiData(response, isOrganization);
  },

  async setStatus(organizationId: string, status: OrganizationStatus): Promise<Organization> {
    const action = status === 'ACTIVE' ? 'activate' : 'deactivate';
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/organizations/${encodeURIComponent(organizationId)}/${action}`,
    );
    return assertApiData(response, isOrganization);
  },
};
