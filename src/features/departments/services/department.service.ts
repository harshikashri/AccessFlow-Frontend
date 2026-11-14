import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import type {
  CreateDepartmentRequest,
  Department,
  DepartmentDetails,
  DepartmentListParams,
  DepartmentListResponse,
  DepartmentManagerCandidate,
  DepartmentPagination,
  DepartmentStatus,
  UpdateDepartmentRequest,
} from '@/features/departments/types/department.types';

const pageLimit = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isDepartment(value: unknown): value is Department {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.organizationId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    (value.status === 'ACTIVE' || value.status === 'INACTIVE') &&
    isNonNegativeInteger(value.managerCount) &&
    isNonNegativeInteger(value.memberCount) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isDepartmentUser(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.accountStatus === 'ACTIVE' || value.accountStatus === 'INACTIVE') &&
    (value.membershipStatus === null ||
      value.membershipStatus === 'ACTIVE' ||
      value.membershipStatus === 'INACTIVE') &&
    (value.membershipId === null || typeof value.membershipId === 'string') &&
    (value.departmentId === null || typeof value.departmentId === 'string')
  );
}

function isDepartmentPagination(value: unknown): value is DepartmentPagination {
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
    throw new Error('The department API returned an unsupported response.');
  }
  return response.data.data;
}

function assertApiData<T>(
  response: AxiosResponse<unknown>,
  isExpected: (value: unknown) => value is T,
): T {
  const data = getApiData(response);
  if (!isExpected(data)) throw new Error('The department API returned an unsupported response.');
  return data;
}

function isDepartmentListResponse(value: unknown): value is DepartmentListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isDepartment) &&
    isDepartmentPagination(value.pagination)
  );
}

function isDepartmentDetails(value: unknown): value is DepartmentDetails {
  return (
    isRecord(value) &&
    isDepartment(value.department) &&
    Array.isArray(value.managers) &&
    value.managers.every(isDepartmentUser) &&
    Array.isArray(value.members) &&
    value.members.every(isDepartmentUser) &&
    isRecord(value.summary) &&
    isNonNegativeInteger(value.summary.managerCount) &&
    isNonNegativeInteger(value.summary.memberCount)
  );
}

function toListParams(params: DepartmentListParams): Record<string, string> {
  return {
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    ...(params.status ? { status: params.status } : {}),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
}

interface DepartmentRole {
  id: string;
  permissions: string[];
  status: DepartmentStatus;
}

interface CandidateRoleAssignment {
  roleId: string;
  scopeType: 'ORGANIZATION' | 'DEPARTMENT';
  departmentId: string | null;
  status: string;
}

interface CandidateUser extends DepartmentManagerCandidate {
  accountStatus: DepartmentStatus;
  membership: { status: DepartmentStatus } | null;
  roleAssignments: CandidateRoleAssignment[];
}

function isDepartmentRole(value: unknown): value is DepartmentRole {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.status === 'ACTIVE' || value.status === 'INACTIVE') &&
    Array.isArray(value.permissions) &&
    value.permissions.every((permission) => typeof permission === 'string')
  );
}

function isCandidateUser(value: unknown): value is CandidateUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.accountStatus === 'ACTIVE' || value.accountStatus === 'INACTIVE') &&
    (value.membership === null ||
      (isRecord(value.membership) &&
        (value.membership.status === 'ACTIVE' || value.membership.status === 'INACTIVE'))) &&
    Array.isArray(value.roleAssignments) &&
    value.roleAssignments.every(
      (assignment) =>
        isRecord(assignment) &&
        typeof assignment.roleId === 'string' &&
        (assignment.scopeType === 'ORGANIZATION' || assignment.scopeType === 'DEPARTMENT') &&
        (assignment.departmentId === null || typeof assignment.departmentId === 'string') &&
        typeof assignment.status === 'string',
    )
  );
}

function isRoleList(
  value: unknown,
): value is { items: DepartmentRole[]; pagination: DepartmentPagination } {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isDepartmentRole) &&
    isDepartmentPagination(value.pagination)
  );
}

function isUserList(
  value: unknown,
): value is { users: CandidateUser[]; pagination: DepartmentPagination } {
  return (
    isRecord(value) &&
    Array.isArray(value.users) &&
    value.users.every(isCandidateUser) &&
    isDepartmentPagination(value.pagination)
  );
}

async function fetchDepartmentRoles(): Promise<DepartmentRole[]> {
  const roles: DepartmentRole[] = [];
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

  return roles.filter(
    (role) => role.status === 'ACTIVE' && role.permissions.includes('departments.edit'),
  );
}

async function fetchUsersWithRole(roleId: string): Promise<CandidateUser[]> {
  const users: CandidateUser[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/users', {
      params: {
        page: String(page),
        limit: String(pageLimit),
        status: 'ACTIVE',
        roleId,
      },
    });
    const result = assertApiData(response, isUserList);
    users.push(...result.users);
    hasNextPage = result.pagination.hasNextPage;
    page += 1;
  }

  return users;
}

export const departmentService = {
  async list(params: DepartmentListParams): Promise<DepartmentListResponse> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/departments', {
      params: toListParams(params),
    });
    return assertApiData(response, isDepartmentListResponse);
  },

  async get(departmentId: string): Promise<DepartmentDetails> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/departments/${encodeURIComponent(departmentId)}`,
    );
    return assertApiData(response, isDepartmentDetails);
  },

  async create(payload: CreateDepartmentRequest): Promise<Department> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/departments', payload);
    return assertApiData(response, isDepartment);
  },

  async update(departmentId: string, payload: UpdateDepartmentRequest): Promise<Department> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/departments/${encodeURIComponent(departmentId)}`,
      payload,
    );
    return assertApiData(response, isDepartment);
  },

  async setStatus(departmentId: string, status: DepartmentStatus): Promise<Department> {
    const action = status === 'ACTIVE' ? 'activate' : 'deactivate';
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/departments/${encodeURIComponent(departmentId)}/${action}`,
    );
    return assertApiData(response, isDepartment);
  },

  async replaceManagers(departmentId: string, managerIds: string[]): Promise<Department> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/departments/${encodeURIComponent(departmentId)}/managers`,
      { managerIds },
    );
    return assertApiData(response, isDepartment);
  },

  async listManagerCandidates(departmentId: string): Promise<DepartmentManagerCandidate[]> {
    const roles = await fetchDepartmentRoles();
    const usersById = new Map<string, DepartmentManagerCandidate>();

    for (const role of roles) {
      const users = await fetchUsersWithRole(role.id);
      for (const user of users) {
        const hasEligibleAssignment = user.roleAssignments.some(
          (assignment) =>
            assignment.roleId === role.id &&
            assignment.status === 'ACTIVE' &&
            ((assignment.scopeType === 'ORGANIZATION' && assignment.departmentId === null) ||
              (assignment.scopeType === 'DEPARTMENT' && assignment.departmentId === departmentId)),
        );
        if (
          hasEligibleAssignment &&
          user.accountStatus === 'ACTIVE' &&
          user.membership?.status === 'ACTIVE'
        ) {
          usersById.set(user.id, { id: user.id, name: user.name, email: user.email });
        }
      }
    }

    return [...usersById.values()].sort((first, second) => first.name.localeCompare(second.name));
  },
};
