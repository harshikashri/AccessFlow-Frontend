import type { OrganizationListParams } from '@/features/organizations/types/organization.types';

export const organizationQueryKeys = {
  all: ['organizations'] as const,
  user: (userId: string) => ['organizations', userId] as const,
  list: (userId: string, params: OrganizationListParams) =>
    ['organizations', userId, 'list', params] as const,
  details: (userId: string, organizationId: string) =>
    ['organizations', userId, 'details', organizationId] as const,
};
