export const requestQueryKeys = {
  all: (userId: string, organizationId: string) => ['requests', userId, organizationId] as const,
  list: (userId: string, organizationId: string, params: unknown) =>
    [...requestQueryKeys.all(userId, organizationId), 'list', params] as const,
  types: (userId: string, organizationId: string) =>
    [...requestQueryKeys.all(userId, organizationId), 'types'] as const,
  type: (userId: string, organizationId: string, typeId: string) =>
    [...requestQueryKeys.types(userId, organizationId), typeId] as const,
  details: (userId: string, organizationId: string, requestId: string) =>
    [...requestQueryKeys.all(userId, organizationId), 'details', requestId] as const,
  progress: (userId: string, organizationId: string, requestId: string) =>
    [...requestQueryKeys.details(userId, organizationId, requestId), 'progress'] as const,
  history: (userId: string, organizationId: string, requestId: string) =>
    [...requestQueryKeys.details(userId, organizationId, requestId), 'history'] as const,
};
