import type { PermissionId } from '@/features/authorization/permission-catalog';

export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type UserScopeType = 'ORGANIZATION' | 'DEPARTMENT';
export type UserRoleType =
  'CUSTOM' | 'EMPLOYEE' | 'DEPARTMENT_MANAGER' | 'ORGANIZATION_ADMIN' | 'FINANCE_APPROVER';
export type UserSortField = 'name' | 'email' | 'accountStatus' | 'createdAt' | 'updatedAt';
export type UserSortOrder = 'asc' | 'desc';

export interface UserDepartmentSummary {
  id: string;
  name: string;
  status: UserStatus;
}

export interface UserMembership {
  membershipId: string;
  organizationId: string;
  organizationStatus: UserStatus | null;
  departmentId: string | null;
  department: UserDepartmentSummary | null;
  status: UserStatus;
}

export interface UserRoleAssignmentSummary {
  roleId: string;
  roleName: string | null;
  scopeType: UserScopeType;
  departmentId: string | null;
  status: UserStatus;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  accountStatus: UserStatus;
  membership: UserMembership;
  roleAssignments: UserRoleAssignmentSummary[];
  createdAt: string;
  updatedAt: string;
  passwordSetupRequired?: boolean;
}

export interface UserPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UserListResponse {
  users: UserProfile[];
  pagination: UserPagination;
}

export interface UserListParams {
  page: number;
  limit: number;
  search: string;
  status?: UserStatus;
  departmentId?: string | null;
  roleId?: string;
  sortBy: UserSortField;
  sortOrder: UserSortOrder;
}

export interface CreateUserRoleAssignment {
  roleId: string;
  scopeType: UserScopeType;
  departmentId: string | null;
}

export type CreateUserRoleAssignmentRequest = Omit<CreateUserRoleAssignment, 'departmentId'> & {
  departmentId?: string;
};

export interface CreateUserRequest {
  name: string;
  email: string;
  departmentId?: string;
  roleAssignments?: CreateUserRoleAssignmentRequest[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export interface AssignUserDepartmentRequest {
  departmentId: string | null;
}

export interface UserRole {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  roleType: UserRoleType;
  rolePurpose: 'GENERAL' | 'FINANCE_APPROVER';
  assignmentScope?: UserScopeType | null;
  assignmentScopes?: UserScopeType[];
  permissions: PermissionId[];
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  assignmentCount?: number;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleName?: string;
  scopeType: UserScopeType;
  departmentId: string | null;
  departmentName?: string;
  status: UserStatus;
  assignedBy: string | null;
  assignedAt: string;
}

export interface UserRoleAssignmentRequest {
  userId: string;
  scopeType: UserScopeType;
  departmentId?: string;
}

export interface RemoveUserRoleAssignmentRequest {
  scopeType: UserScopeType;
  departmentId?: string;
}

export interface UpdateUserRoleAssignmentRequest {
  scopeType: UserScopeType;
  departmentId?: string;
}

export interface UserRoleAssignmentList {
  items: UserRoleAssignment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserFormValues {
  name: string;
  email: string;
  departmentId: string;
  roleAssignments: CreateUserRoleAssignment[];
}

export interface UserFormErrors {
  name?: string;
  email?: string;
  departmentId?: string;
  roleAssignments?: string;
}
