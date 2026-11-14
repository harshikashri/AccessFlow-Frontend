import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import type {
  ApprovalDelegation,
  ApprovalDetails,
  ApprovalInboxParams,
  ApprovalInboxResponse,
  ApprovalStep,
} from '../types/approval.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dataOf(response: AxiosResponse<unknown>): unknown {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The approval API returned an unsupported response.');
  }
  return response.data.data;
}

function recordOf(response: AxiosResponse<unknown>) {
  const data = dataOf(response);
  if (!isRecord(data)) throw new Error('The approval API returned an unsupported response.');
  return data;
}

function normalizeStep(value: unknown): ApprovalStep | null {
  if (!isRecord(value)) return null;
  const id =
    typeof value.id === 'string' ? value.id : typeof value._id === 'string' ? value._id : null;
  if (
    !id ||
    typeof value.requestId !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.stageName !== 'string'
  ) {
    return null;
  }
  const request = isRecord(value.request) ? { ...value.request } : value.request;
  if (isRecord(request)) {
    const requestId =
      typeof request.id === 'string'
        ? request.id
        : typeof request._id === 'string'
          ? request._id
          : null;
    if (requestId) {
      request.id = requestId;
    }
  }
  return { ...value, id, ...(request ? { request } : {}) } as unknown as ApprovalStep;
}

function paramsOf(params: ApprovalInboxParams): Record<string, string> {
  return {
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    ...(params.category ? { category: params.category } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.requestTypeId ? { requestTypeId: params.requestTypeId } : {}),
    ...(params.departmentId ? { departmentId: params.departmentId } : {}),
  };
}

export const approvalService = {
  async list(params: ApprovalInboxParams): Promise<ApprovalInboxResponse> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/approvals/inbox', {
      params: paramsOf(params),
    });
    const data = recordOf(response);
    const pagination = isRecord(data.pagination) ? data.pagination : null;
    if (
      !Array.isArray(data.items) ||
      !pagination ||
      !['page', 'limit', 'total', 'totalPages'].every((key) => typeof pagination[key] === 'number')
    ) {
      throw new Error('The approval inbox returned an unsupported response.');
    }
    const items = data.items.map(normalizeStep);
    if (items.some((item) => item === null)) {
      throw new Error('The approval inbox returned an unsupported response.');
    }
    return {
      items: items as ApprovalStep[],
      pagination: pagination as unknown as ApprovalInboxResponse['pagination'],
    };
  },

  async get(stepId: string): Promise<ApprovalDetails> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/approvals/${encodeURIComponent(stepId)}`,
    );
    const data = recordOf(response);
    const approval = normalizeStep(data.approval);
    const history = Array.isArray(data.history) ? data.history.map(normalizeStep) : null;
    if (!approval || !isRecord(data.request) || !history || history.some((item) => item === null)) {
      throw new Error('The approval details API returned an unsupported response.');
    }
    return {
      ...data,
      approval,
      history: history as ApprovalStep[],
    } as unknown as ApprovalDetails;
  },

  async claim(stepId: string): Promise<ApprovalStep> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/approvals/${encodeURIComponent(stepId)}/claim`,
    );
    const data = dataOf(response);
    const step = normalizeStep(data);
    if (!step) throw new Error('The approval claim API returned an unsupported response.');
    return step;
  },

  async approve(stepId: string, comment: string): Promise<ApprovalStep> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/approvals/${encodeURIComponent(stepId)}/approve`,
      { comment },
    );
    const data = dataOf(response);
    const step = normalizeStep(data);
    if (!step) throw new Error('The approval API returned an unsupported response.');
    return step;
  },

  async reject(stepId: string, comment: string): Promise<ApprovalStep> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/approvals/${encodeURIComponent(stepId)}/reject`,
      { comment },
    );
    const data = dataOf(response);
    const step = normalizeStep(data);
    if (!step) throw new Error('The approval API returned an unsupported response.');
    return step;
  },

  async returnForCorrection(stepId: string, reason: string): Promise<ApprovalStep> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/approvals/${encodeURIComponent(stepId)}/return`,
      { reason },
    );
    const data = dataOf(response);
    const step = normalizeStep(data);
    if (!step) throw new Error('The approval API returned an unsupported response.');
    return step;
  },

  async listDelegations(): Promise<{ items: ApprovalDelegation[] }> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/approval-delegations');
    const data = recordOf(response);
    if (!Array.isArray(data.items))
      throw new Error('The delegation API returned an unsupported response.');
    return data as unknown as { items: ApprovalDelegation[] };
  },

  async createDelegation(payload: {
    delegateId: string;
    scopeType: 'ORGANIZATION' | 'DEPARTMENT';
    departmentId: string | null;
    stageIds: string[];
    startsAt: string;
    endsAt: string;
  }): Promise<ApprovalDelegation> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/approval-delegations', payload);
    const data = dataOf(response);
    if (!isRecord(data) || typeof data.id !== 'string')
      throw new Error('The delegation API returned an unsupported response.');
    return data as unknown as ApprovalDelegation;
  },

  async revokeDelegation(delegationId: string): Promise<ApprovalDelegation> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/approval-delegations/${encodeURIComponent(delegationId)}/revoke`,
    );
    const data = dataOf(response);
    if (!isRecord(data) || typeof data.id !== 'string')
      throw new Error('The delegation API returned an unsupported response.');
    return data as unknown as ApprovalDelegation;
  },
};
