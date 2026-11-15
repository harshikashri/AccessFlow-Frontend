import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workflowService } from '../services/workflow.service';
import type { Workflow, WorkflowInput, WorkflowListParams } from '../types/workflow.types';
import { workflowQueryKeys } from './workflow-query-keys';

export function useWorkflowList(
  userId: string,
  organizationId: string,
  params: WorkflowListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: workflowQueryKeys.list(userId, organizationId, params),
    queryFn: () => workflowService.list(params),
    enabled: enabled && Boolean(userId && organizationId),
  });
}

export function useWorkflowDetails(
  userId: string,
  organizationId: string,
  workflowId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: workflowQueryKeys.details(userId, organizationId, workflowId),
    queryFn: () => workflowService.get(workflowId),
    enabled: enabled && Boolean(userId && organizationId && workflowId),
  });
}

function useWorkflowMutation(
  userId: string,
  organizationId: string,
  mutationFn: (payload: WorkflowInput) => Promise<Workflow>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.all(userId, organizationId) }),
  });
}

export function useCreateWorkflow(userId: string, organizationId: string) {
  return useWorkflowMutation(userId, organizationId, workflowService.create);
}

export function useUpdateWorkflow(userId: string, organizationId: string, workflowId: string) {
  return useWorkflowMutation(userId, organizationId, (payload) =>
    workflowService.update(workflowId, payload),
  );
}

export function useSetWorkflowStatus(userId: string, organizationId: string, workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) => workflowService.setStatus(workflowId, isActive),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.all(userId, organizationId) }),
  });
}
