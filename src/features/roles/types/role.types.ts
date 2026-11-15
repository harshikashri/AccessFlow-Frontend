import type { PermissionId } from '@/features/authorization/permission-catalog';
import type {
  UserRole,
  UserRoleAssignment,
  UserRoleAssignmentRequest,
  UserScopeType,
  UserStatus,
} from '@/features/users/types/user.types';

export type ManagedRole = UserRole & {
  assignmentCount: number;
  createdBy: string | null;
};

export type RoleStatus = UserStatus;
export type RoleScopeType = UserScopeType;

export interface RoleListParams {
  page: number;
  limit: number;
  search: string;
  status?: RoleStatus;
  sortBy: 'name' | 'roleType' | 'status' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

export interface RolePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface RoleListResponse {
  items: ManagedRole[];
  pagination: RolePagination;
}

export interface PermissionCatalogItem {
  id: PermissionId;
  name: string;
  description: string;
}

export interface PermissionCatalogModule {
  id: string;
  name: string;
  permissions: PermissionCatalogItem[];
}

export interface PermissionCatalogResponse {
  modules: PermissionCatalogModule[];
}

export interface RoleUser {
  id: string;
  name: string;
  email: string;
  accountStatus: RoleStatus;
}

export interface RoleUserAssignment extends UserRoleAssignment {
  user?: RoleUser;
}

export interface AssignmentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RoleUserListResponse {
  items: RoleUserAssignment[];
  pagination: AssignmentPagination;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permissions: PermissionId[];
  rolePurpose: 'GENERAL' | 'FINANCE_APPROVER';
  assignmentScopes: RoleScopeType[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  rolePurpose?: 'GENERAL' | 'FINANCE_APPROVER';
  assignmentScopes?: RoleScopeType[];
}

export interface RoleFormValues {
  name: string;
  description: string;
  rolePurpose: 'GENERAL' | 'FINANCE_APPROVER';
  assignmentScopes: RoleScopeType[];
}

export interface RoleFormErrors {
  name?: string;
  description?: string;
  assignmentScopes?: string;
}

export type RoleAssignmentPayload = UserRoleAssignmentRequest;
