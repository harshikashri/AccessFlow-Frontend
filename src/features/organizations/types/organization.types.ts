export type OrganizationStatus = 'ACTIVE' | 'INACTIVE';
export type OrganizationSortField = 'name' | 'createdAt' | 'updatedAt' | 'status';
export type OrganizationSortOrder = 'asc' | 'desc';

export interface Organization {
  id: string;
  name: string;
  status: OrganizationStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface OrganizationListParams {
  page: number;
  limit: number;
  search: string;
  status?: OrganizationStatus;
  sortBy: OrganizationSortField;
  sortOrder: OrganizationSortOrder;
}

export interface OrganizationListResponse {
  items: Organization[];
  pagination: OrganizationPagination;
}

export interface OrganizationDetails {
  organization: Organization;
  summary: {
    memberCount: number;
    activeMemberCount: number;
    departmentCount: number;
  };
}

export interface CreateOrganizationRequest {
  name: string;
  admin: {
    name: string;
    email: string;
    password: string;
  };
}

export interface CreateOrganizationResponse {
  organization: Organization;
  admin: {
    id: string;
    name: string;
    email: string;
    accountStatus: OrganizationStatus;
    platformRole: 'SUPER_ADMIN' | null;
    organizationId: string | null;
  };
  role: {
    id: string;
    name: string;
  };
}

export interface UpdateOrganizationRequest {
  name: string;
}

export interface OrganizationFormValues {
  name: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export type OrganizationFormErrors = Partial<Record<keyof OrganizationFormValues, string>>;
