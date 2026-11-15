import type { WorkflowListParams } from '../types/workflow.types';

export const workflowQueryKeys = {
  all: (userId: string, organizationId: string) => ['workflows', userId, organizationId] as const,
  list: (userId: string, organizationId: string, params: WorkflowListParams) =>
    [...workflowQueryKeys.all(userId, organizationId), 'list', params] as const,
  details: (userId: string, organizationId: string, workflowId: string) =>
    [...workflowQueryKeys.all(userId, organizationId), 'details', workflowId] as const,
};
