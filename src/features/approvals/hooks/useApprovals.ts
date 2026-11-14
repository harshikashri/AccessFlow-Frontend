import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalService } from '../services/approval.service';
import { approvalQueryKeys } from './approval-query-keys';
import type { ApprovalInboxParams } from '../types/approval.types';

export function useApprovalInbox(
  userId: string,
  organizationId: string,
  params: ApprovalInboxParams,
  enabled = true,
) {
  return useQuery({
    queryKey: approvalQueryKeys.inbox(userId, organizationId, params),
    queryFn: () => approvalService.list(params),
    enabled: enabled && Boolean(userId && organizationId),
  });
}

export function useApprovalDetails(
  userId: string,
  organizationId: string,
  stepId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: approvalQueryKeys.details(userId, organizationId, stepId),
    queryFn: () => approvalService.get(stepId),
    enabled: enabled && Boolean(userId && organizationId && stepId),
  });
}

function useApprovalAction(
  userId: string,
  organizationId: string,
  action: (stepId: string, text: string) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, text }: { stepId: string; text?: string }) => action(stepId, text || ''),
    onSuccess: (_data, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all(userId, organizationId) }),
        queryClient.invalidateQueries({ queryKey: ['requests', userId, organizationId] }),
        queryClient.invalidateQueries({
          queryKey: approvalQueryKeys.details(userId, organizationId, variables.stepId),
        }),
      ]),
  });
}

export function useClaimApproval(userId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepId: string) => approvalService.claim(stepId),
    onSuccess: (_data, stepId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all(userId, organizationId) }),
        queryClient.invalidateQueries({
          queryKey: approvalQueryKeys.details(userId, organizationId, stepId),
        }),
      ]),
  });
}

export function useApproveApproval(userId: string, organizationId: string) {
  return useApprovalAction(userId, organizationId, approvalService.approve);
}

export function useRejectApproval(userId: string, organizationId: string) {
  return useApprovalAction(userId, organizationId, approvalService.reject);
}

export function useReturnApproval(userId: string, organizationId: string) {
  return useApprovalAction(userId, organizationId, approvalService.returnForCorrection);
}

export function useDelegations(userId: string, organizationId: string, enabled = true) {
  return useQuery({
    queryKey: approvalQueryKeys.delegations(userId, organizationId),
    queryFn: () => approvalService.listDelegations(),
    enabled: enabled && Boolean(userId && organizationId),
  });
}

export function useCreateDelegation(userId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approvalService.createDelegation,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: approvalQueryKeys.delegations(userId, organizationId),
      }),
  });
}

export function useRevokeDelegation(userId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (delegationId: string) => approvalService.revokeDelegation(delegationId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: approvalQueryKeys.delegations(userId, organizationId),
      }),
  });
}
