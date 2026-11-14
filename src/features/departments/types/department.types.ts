export type DepartmentStatus = 'ACTIVE' | 'INACTIVE';
export type DepartmentSortField = 'name' | 'description' | 'status' | 'createdAt' | 'updatedAt';
export type DepartmentSortOrder = 'asc' | 'desc';

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: DepartmentStatus;
  managerCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentUser {
  id: string;
  name: string;
  email: string;
  accountStatus: DepartmentStatus;
  membershipStatus: DepartmentStatus | null;
  membershipId: string | null;
  departmentId: string | null;
}

export interface DepartmentSummary {
  managerCount: number;
  memberCount: number;
}

export interface DepartmentDetails {
  department: Department;
  managers: DepartmentUser[];
  members: DepartmentUser[];
  summary: DepartmentSummary;
}

export interface DepartmentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface DepartmentListResponse {
  items: Department[];
  pagination: DepartmentPagination;
}

export interface DepartmentListParams {
  page: number;
  limit: number;
  search: string;
  status?: DepartmentStatus;
  sortBy: DepartmentSortField;
  sortOrder: DepartmentSortOrder;
}

export interface CreateDepartmentRequest {
  name: string;
  description: string;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;

export interface DepartmentFormValues {
  name: string;
  description: string;
}

export interface DepartmentFormErrors {
  name?: string;
  description?: string;
}

export interface DepartmentManagerCandidate {
  id: string;
  name: string;
  email: string;
}
