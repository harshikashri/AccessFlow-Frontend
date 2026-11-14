export const approvalQueryKeys = {
  all: (userId: string, organizationId: string) => ['approvals', userId, organizationId] as const,
  inbox: (userId: string, organizationId: string, params: unknown) =>
    [...approvalQueryKeys.all(userId, organizationId), 'inbox', params] as const,
  details: (userId: string, organizationId: string, stepId: string) =>
    [...approvalQueryKeys.all(userId, organizationId), 'details', stepId] as const,
  delegations: (userId: string, organizationId: string) =>
    [...approvalQueryKeys.all(userId, organizationId), 'delegations'] as const,
};
