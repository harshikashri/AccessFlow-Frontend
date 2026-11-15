import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import { PERMISSION_IDS } from '@/features/authorization/permission-catalog';
import type { PermissionId } from '@/features/authorization/permission-catalog';
import type {
  UpdateUserRoleAssignmentRequest,
  UserRole,
  UserRoleAssignment,
  UserStatus,
} from '@/features/users/types/user.types';
import type {
  AssignmentPagination,
  CreateRoleRequest,
  ManagedRole,
  PermissionCatalogResponse,
  RoleListParams,
  RoleListResponse,
  RolePagination,
  RoleStatus,
  RoleUserAssignment,
  RoleUserListResponse,
  UpdateRoleRequest,
} from '@/features/roles/types/role.types';

const permissionIds = new Set<string>(PERMISSION_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is UserStatus {
  return value === 'ACTIVE' || value === 'INACTIVE';
}

function isPermissionId(value: unknown): value is PermissionId {
  return typeof value === 'string' && permissionIds.has(value);
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

function isRole(value: unknown): value is ManagedRole {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.organizationId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    isRoleType(value.roleType) &&
    (value.rolePurpose === 'GENERAL' || value.rolePurpose === 'FINANCE_APPROVER') &&
    Array.isArray(value.permissions) &&
    value.permissions.every(isPermissionId) &&
    new Set(value.permissions).size === value.permissions.length &&
    isStatus(value.status) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.createdBy === null || typeof value.createdBy === 'string') &&
    typeof value.assignmentCount === 'number' &&
    Number.isInteger(value.assignmentCount) &&
    value.assignmentCount >= 0
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isRolePagination(value: unknown): value is RolePagination {
  return (
    isRecord(value) &&
    isPositiveInteger(value.page) &&
    isPositiveInteger(value.limit) &&
    isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.totalPages) &&
    typeof value.hasNextPage === 'boolean' &&
    typeof value.hasPreviousPage === 'boolean'
  );
}

function isRoleList(value: unknown): value is RoleListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isRole) &&
    isRolePagination(value.pagination)
  );
}

function isPermissionCatalog(value: unknown): value is PermissionCatalogResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.modules) &&
    value.modules.every(
      (module) =>
        isRecord(module) &&
        typeof module.id === 'string' &&
        typeof module.name === 'string' &&
        Array.isArray(module.permissions) &&
        module.permissions.every(
          (permission) =>
            isRecord(permission) &&
            isPermissionId(permission.id) &&
            typeof permission.name === 'string' &&
            typeof permission.description === 'string',
        ),
    )
  );
}

function isRoleUser(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    isStatus(value.accountStatus)
  );
}

function isRoleAssignment(value: unknown): value is RoleUserAssignment {
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
    typeof value.assignedAt === 'string' &&
    (value.user === undefined || isRoleUser(value.user))
  );
}

function isAssignmentPagination(value: unknown): value is AssignmentPagination {
  return (
    isRecord(value) &&
    isPositiveInteger(value.page) &&
    isPositiveInteger(value.limit) &&
    isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.totalPages)
  );
}

function isRoleUserList(value: unknown): value is RoleUserListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isRoleAssignment) &&
    isAssignmentPagination(value.pagination)
  );
}

function getApiData(response: AxiosResponse<unknown>): unknown {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The role API returned an unsupported response.');
  }
  return response.data.data;
}

function assertApiData<T>(
  response: AxiosResponse<unknown>,
  isExpected: (value: unknown) => value is T,
): T {
  const data = getApiData(response);
  if (!isExpected(data)) {
    throw new Error('The role API returned an unsupported response.');
  }
  return data;
}

function toListParams(params: RoleListParams): Record<string, string> {
  return {
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    ...(params.status ? { status: params.status } : {}),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
}

function assertRole(response: AxiosResponse<unknown>): ManagedRole {
  const data = getApiData(response);
  if (!isRole(data)) {
    throw new Error('The role API returned an unsupported response.');
  }
  return data;
}

export const roleService = {
  async list(params: RoleListParams): Promise<RoleListResponse> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/roles', {
      params: toListParams(params),
    });
    return assertApiData(response, isRoleList);
  },

  async get(roleId: string): Promise<ManagedRole> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/roles/${encodeURIComponent(roleId)}`,
    );
    return assertRole(response);
  },

  async create(payload: CreateRoleRequest): Promise<ManagedRole> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/roles', payload);
    return assertRole(response);
  },

  async update(roleId: string, payload: UpdateRoleRequest): Promise<ManagedRole> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/roles/${encodeURIComponent(roleId)}`,
      payload,
    );
    return assertRole(response);
  },

  async updatePermissions(roleId: string, permissions: PermissionId[]): Promise<ManagedRole> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/roles/${encodeURIComponent(roleId)}/permissions`,
      { permissions },
    );
    return assertRole(response);
  },

  async setStatus(roleId: string, status: RoleStatus): Promise<ManagedRole> {
    const action = status === 'ACTIVE' ? 'activate' : 'deactivate';
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/roles/${encodeURIComponent(roleId)}/${action}`,
    );
    return assertRole(response);
  },

  async getPermissionCatalog(): Promise<PermissionCatalogResponse> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/roles/permissions/catalog');
    return assertApiData(response, isPermissionCatalog);
  },

  async listUsers(roleId: string, page: number, limit: number): Promise<RoleUserListResponse> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/roles/${encodeURIComponent(roleId)}/users`,
      { params: { page: String(page), limit: String(limit) } },
    );
    return assertApiData(response, isRoleUserList);
  },

  async updateAssignment(
    assignmentId: string,
    payload: UpdateUserRoleAssignmentRequest,
  ): Promise<UserRoleAssignment> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/roles/assignments/${encodeURIComponent(assignmentId)}`,
      payload,
    );
    return assertApiData(response, isRoleAssignment);
  },
};
