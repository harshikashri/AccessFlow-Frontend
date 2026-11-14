import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import { PERMISSION_IDS } from '@/features/authorization/permission-catalog';
import type {
  RemoveUserRoleAssignmentRequest,
  UserPagination,
  UserRole,
  UserRoleAssignment,
  UserRoleAssignmentList,
  UserRoleAssignmentRequest,
} from '@/features/users/types/user.types';

const pageLimit = 100;
const permissionIds = new Set<string>(PERMISSION_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is 'ACTIVE' | 'INACTIVE' {
  return value === 'ACTIVE' || value === 'INACTIVE';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isRoleType(value: unknown): value is UserRole['roleType'] {
  return (
    value === 'CUSTOM' ||
    value === 'EMPLOYEE' ||
    value === 'DEPARTMENT_MANAGER' ||
    value === 'ORGANIZATION_ADMIN' ||
    value === 'FINANCE_APPROVER'
  );
}

function isRole(value: unknown): value is UserRole {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.organizationId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    isRoleType(value.roleType) &&
    typeof value.rolePurpose === 'string' &&
    Array.isArray(value.permissions) &&
    value.permissions.every(
      (permission) => typeof permission === 'string' && permissionIds.has(permission),
    ) &&
    isStatus(value.status) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isAssignment(value: unknown): value is UserRoleAssignment {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.roleId === 'string' &&
    (value.roleName === undefined || typeof value.roleName === 'string') &&
    (value.scopeType === 'ORGANIZATION' || value.scopeType === 'DEPARTMENT') &&
    (value.departmentId === null || typeof value.departmentId === 'string') &&
    (value.departmentName === undefined || typeof value.departmentName === 'string') &&
    isStatus(value.status) &&
    (value.assignedBy === null || typeof value.assignedBy === 'string') &&
    typeof value.assignedAt === 'string'
  );
}

function isPagination(value: unknown): value is UserPagination {
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

function isRoleList(value: unknown): value is { items: UserRole[]; pagination: UserPagination } {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isRole) &&
    isPagination(value.pagination)
  );
}

function isAssignmentList(value: unknown): value is UserRoleAssignmentList {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isAssignment) &&
    isRecord(value.pagination) &&
    isNonNegativeInteger(value.pagination.page) &&
    value.pagination.page > 0 &&
    isNonNegativeInteger(value.pagination.limit) &&
    value.pagination.limit > 0 &&
    isNonNegativeInteger(value.pagination.total) &&
    isNonNegativeInteger(value.pagination.totalPages)
  );
}

function getApiData(response: AxiosResponse<unknown>): unknown {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The role assignment API returned an unsupported response.');
  }
  return response.data.data;
}

function assertApiData<T>(
  response: AxiosResponse<unknown>,
  isExpected: (value: unknown) => value is T,
): T {
  const data = getApiData(response);
  if (!isExpected(data)) {
    throw new Error('The role assignment API returned an unsupported response.');
  }
  return data;
}

export const userRoleService = {
  async listActiveRoles(): Promise<UserRole[]> {
    const roles: UserRole[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/roles', {
        params: { page: String(page), limit: String(pageLimit), status: 'ACTIVE' },
      });
      const result = assertApiData(response, isRoleList);
      roles.push(...result.items);
      hasNextPage = result.pagination.hasNextPage;
      page += 1;
    }

    return roles;
  },

  async listAssignments(userId: string): Promise<UserRoleAssignment[]> {
    const assignments: UserRoleAssignment[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await apiClient.get<ApiEnvelope<unknown>>(
        `/roles/users/${encodeURIComponent(userId)}`,
        { params: { page: String(page), limit: String(pageLimit) } },
      );
      const result = assertApiData(response, isAssignmentList);
      assignments.push(...result.items);
      totalPages = result.pagination.totalPages;
      page += 1;
    }

    return assignments;
  },

  async assign(roleId: string, payload: UserRoleAssignmentRequest): Promise<UserRoleAssignment> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/roles/${encodeURIComponent(roleId)}/assign`,
      payload,
    );
    return assertApiData(response, isAssignment);
  },

  async remove(
    roleId: string,
    userId: string,
    payload: RemoveUserRoleAssignmentRequest,
  ): Promise<{ assignmentId: string; status: 'INACTIVE' }> {
    const response = await apiClient.delete<ApiEnvelope<unknown>>(
      `/roles/${encodeURIComponent(roleId)}/assign/${encodeURIComponent(userId)}`,
      { data: payload },
    );
    const data = getApiData(response);
    if (!isRecord(data) || typeof data.assignmentId !== 'string' || data.status !== 'INACTIVE') {
      throw new Error('The role assignment API returned an unsupported response.');
    }
    return { assignmentId: data.assignmentId, status: 'INACTIVE' };
  },
};
