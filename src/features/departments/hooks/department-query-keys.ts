import type { DepartmentListParams } from '@/features/departments/types/department.types';

export const departmentQueryKeys = {
  all: ['departments'] as const,
  user: (userId: string, organizationId: string) =>
    ['departments', userId, organizationId] as const,
  list: (userId: string, organizationId: string, params: DepartmentListParams) =>
    ['departments', userId, organizationId, 'list', params] as const,
  details: (userId: string, organizationId: string, departmentId: string) =>
    ['departments', userId, organizationId, 'details', departmentId] as const,
  managerCandidates: (userId: string, organizationId: string, departmentId: string) =>
    ['departments', userId, organizationId, 'manager-candidates', departmentId] as const,
};
