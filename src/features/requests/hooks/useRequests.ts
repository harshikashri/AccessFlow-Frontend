import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requestService } from '../services/request.service';
import { requestQueryKeys } from './request-query-keys';
import type { RequestInput, RequestListParams, RequestSummary } from '../types/request.types';

export function useRequestTypes(userId: string, organizationId: string, enabled = true) {
  return useQuery({
    queryKey: requestQueryKeys.types(userId, organizationId),
    queryFn: () => requestService.listTypes(),
    enabled: enabled && Boolean(userId && organizationId),
  });
}

export function useRequestType(
  userId: string,
  organizationId: string,
  typeId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: requestQueryKeys.type(userId, organizationId, typeId),
    queryFn: () => requestService.getType(typeId),
    enabled: enabled && Boolean(userId && organizationId && typeId),
  });
}

export function useRequestList(
  userId: string,
  organizationId: string,
  params: RequestListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: requestQueryKeys.list(userId, organizationId, params),
    queryFn: () => requestService.list(params),
    enabled: enabled && Boolean(userId && organizationId),
  });
}

export function useRequestDetails(
  userId: string,
  organizationId: string,
  requestId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: requestQueryKeys.details(userId, organizationId, requestId),
    queryFn: () => requestService.get(requestId),
    enabled: enabled && Boolean(userId && organizationId && requestId),
  });
}

export function useRequestProgress(
  userId: string,
  organizationId: string,
  requestId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: requestQueryKeys.progress(userId, organizationId, requestId),
    queryFn: () => requestService.progress(requestId),
    enabled: enabled && Boolean(userId && organizationId && requestId),
  });
}

export function useRequestHistory(
  userId: string,
  organizationId: string,
  requestId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: requestQueryKeys.history(userId, organizationId, requestId),
    queryFn: () => requestService.history(requestId),
    enabled: enabled && Boolean(userId && organizationId && requestId),
  });
}

function useRequestMutation(
  userId: string,
  organizationId: string,
  mutationFn: (payload: RequestInput) => Promise<RequestSummary>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: requestQueryKeys.all(userId, organizationId) }),
  });
}

export function useCreateRequest(userId: string, organizationId: string) {
  return useRequestMutation(userId, organizationId, (payload) => requestService.create(payload));
}

export function useUpdateRequest(userId: string, organizationId: string, requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<RequestInput>) => requestService.update(requestId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: requestQueryKeys.all(userId, organizationId) }),
  });
}

function useRequestAction(
  userId: string,
  organizationId: string,
  action: (requestId: string) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (_data, requestId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: requestQueryKeys.all(userId, organizationId) }),
        queryClient.invalidateQueries({
          queryKey: requestQueryKeys.details(userId, organizationId, requestId),
        }),
      ]),
  });
}

export function useSubmitRequest(userId: string, organizationId: string) {
  return useRequestAction(userId, organizationId, requestService.submit);
}

export function useResubmitRequest(userId: string, organizationId: string) {
  return useRequestAction(userId, organizationId, requestService.resubmit);
}

export function useCancelRequest(userId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      cancellationReason,
    }: {
      requestId: string;
      cancellationReason: string;
    }) => requestService.cancel(requestId, cancellationReason),
    onSuccess: (_data, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: requestQueryKeys.all(userId, organizationId) }),
        queryClient.invalidateQueries({
          queryKey: requestQueryKeys.details(userId, organizationId, variables.requestId),
        }),
      ]),
  });
}
