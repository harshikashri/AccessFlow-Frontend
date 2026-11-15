import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import type {
  AssignUserDepartmentRequest,
  CreateUserRequest,
  UserListParams,
  UserListResponse,
  UserProfile,
  UpdateUserRequest,
  UserStatus,
} from '@/features/users/types/user.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is UserStatus {
  return value === 'ACTIVE' || value === 'INACTIVE';
}

function isOptionalString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isDepartmentSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isStatus(value.status)
  );
}

function isMembership(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.membershipId === 'string' &&
    typeof value.organizationId === 'string' &&
    isOptionalString(value.organizationStatus) &&
    (value.organizationStatus === null || isStatus(value.organizationStatus)) &&
    isOptionalString(value.departmentId) &&
    (value.department === null || isDepartmentSummary(value.department)) &&
    isStatus(value.status)
  );
}

function isRoleAssignmentSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.roleId === 'string' &&
    isOptionalString(value.roleName) &&
    (value.scopeType === 'ORGANIZATION' || value.scopeType === 'DEPARTMENT') &&
    isOptionalString(value.departmentId) &&
    isStatus(value.status)
  );
}

function isUserProfile(value: unknown): value is UserProfile {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    isStatus(value.accountStatus) &&
    isMembership(value.membership) &&
    Array.isArray(value.roleAssignments) &&
    value.roleAssignments.every(isRoleAssignmentSummary) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.passwordSetupRequired === undefined || typeof value.passwordSetupRequired === 'boolean')
  );
}

function isPagination(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.page) &&
    value.page > 0 &&
    isNonNegativeInteger(value.limit) &&
    value.limit > 0 &&
    isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.totalPages) &&
    typeof value.hasNextPage === 'boolean' &&
    typeof value.hasPreviousPage === 'boolean'
  );
}

function isUserListResponse(value: unknown): value is UserListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.users) &&
    value.users.every(isUserProfile) &&
    isPagination(value.pagination)
  );
}

function getApiData(response: AxiosResponse<unknown>): unknown {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The user API returned an unsupported response.');
  }
  return response.data.data;
}

function assertSuccess(response: AxiosResponse<unknown>): void {
  if (!isRecord(response.data) || response.data.success !== true) {
    throw new Error('The user API returned an unsupported response.');
  }
}

function assertApiData<T>(
  response: AxiosResponse<unknown>,
  isExpected: (value: unknown) => value is T,
): T {
  const data = getApiData(response);
  if (!isExpected(data)) throw new Error('The user API returned an unsupported response.');
  return data;
}

function toListParams(params: UserListParams): Record<string, string> {
  return {
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    ...(params.status ? { status: params.status } : {}),
    ...(params.departmentId !== undefined ? { departmentId: params.departmentId ?? 'null' } : {}),
    ...(params.roleId ? { roleId: params.roleId } : {}),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
}

export const userService = {
  async list(params: UserListParams, signal?: AbortSignal): Promise<UserListResponse> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/users', {
      params: toListParams(params),
      ...(signal ? { signal } : {}),
    });
    return assertApiData(response, isUserListResponse);
  },

  async get(userId: string): Promise<UserProfile> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/users/${encodeURIComponent(userId)}`,
    );
    return assertApiData(response, isUserProfile);
  },

  async create(payload: CreateUserRequest): Promise<UserProfile> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/users', payload);
    return assertApiData(response, isUserProfile);
  },

  async update(userId: string, payload: UpdateUserRequest): Promise<UserProfile> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/users/${encodeURIComponent(userId)}`,
      payload,
    );
    return assertApiData(response, isUserProfile);
  },

  async assignDepartment(
    userId: string,
    payload: AssignUserDepartmentRequest,
  ): Promise<UserProfile> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/users/${encodeURIComponent(userId)}/department`,
      payload,
    );
    return assertApiData(response, isUserProfile);
  },

  async setMembershipStatus(userId: string, status: UserStatus): Promise<UserProfile> {
    const action = status === 'ACTIVE' ? 'activate' : 'deactivate';
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/users/${encodeURIComponent(userId)}/${action}`,
    );
    return assertApiData(response, isUserProfile);
  },

  async sendPasswordInstructions(userId: string): Promise<void> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/users/${encodeURIComponent(userId)}/password-reset`,
    );
    assertSuccess(response);
  },
};
