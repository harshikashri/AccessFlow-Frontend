import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import type {
  ApprovalHistory,
  ApprovalProgress,
  RequestInput,
  RequestListParams,
  RequestListResponse,
  RequestPagination,
  RequestSummary,
  RequestType,
} from '../types/request.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getData(response: AxiosResponse<unknown>): unknown {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The request API returned an unsupported response.');
  }
  return response.data.data;
}

function assertRecord(response: AxiosResponse<unknown>): Record<string, unknown> {
  const data = getData(response);
  if (!isRecord(data)) throw new Error('The request API returned an unsupported response.');
  return data;
}

function isPagination(value: unknown): value is RequestPagination {
  return (
    isRecord(value) &&
    typeof value.page === 'number' &&
    typeof value.limit === 'number' &&
    typeof value.total === 'number' &&
    typeof value.totalPages === 'number' &&
    typeof value.hasNextPage === 'boolean' &&
    typeof value.hasPreviousPage === 'boolean'
  );
}

function isRequestType(value: unknown): value is RequestType {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.code === 'string' &&
    typeof value.description === 'string' &&
    Array.isArray(value.fields) &&
    typeof value.isActive === 'boolean'
  );
}

function isRequest(value: unknown): value is RequestSummary {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.requestNumber === 'string' &&
    typeof value.title === 'string' &&
    typeof value.status === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function normalizeRequest(value: unknown): RequestSummary | null {
  if (!isRecord(value)) return null;
  const id =
    typeof value.id === 'string' ? value.id : typeof value._id === 'string' ? value._id : null;
  if (!id) return null;
  const normalized = { ...value, id };
  return isRequest(normalized) ? normalized : null;
}

function assertRequest(response: AxiosResponse<unknown>): RequestSummary {
  const data = getData(response);
  const request = normalizeRequest(data);
  if (!request) throw new Error('The request API returned an unsupported response.');
  return request;
}

function toParams(params: RequestListParams): Record<string, string> {
  return {
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    ...(params.status ? { status: params.status } : {}),
    ...(params.requestTypeId ? { requestTypeId: params.requestTypeId } : {}),
    ...(params.departmentId ? { departmentId: params.departmentId } : {}),
    ...(params.requesterId ? { requesterId: params.requesterId } : {}),
    ...(params.derivedFilter ? { derivedFilter: params.derivedFilter } : {}),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
}

export const requestService = {
  async listTypes(): Promise<{ items: RequestType[] }> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/request-types');
    const data = assertRecord(response);
    if (!Array.isArray(data.items) || !data.items.every(isRequestType)) {
      throw new Error('The request type API returned an unsupported response.');
    }
    return { items: data.items };
  },

  async getType(requestTypeId: string): Promise<RequestType> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/request-types/${encodeURIComponent(requestTypeId)}`,
    );
    const data = getData(response);
    if (!isRequestType(data))
      throw new Error('The request type API returned an unsupported response.');
    return data;
  },

  async list(params: RequestListParams, signal?: AbortSignal): Promise<RequestListResponse> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/requests', {
      params: toParams(params),
      ...(signal ? { signal } : {}),
    });
    const data = assertRecord(response);
    if (
      !Array.isArray(data.items) ||
      !data.items.every((item) => normalizeRequest(item) !== null) ||
      !isPagination(data.pagination)
    ) {
      throw new Error('The request API returned an unsupported response.');
    }
    return {
      items: data.items.map((item) => normalizeRequest(item) as RequestSummary),
      pagination: data.pagination,
    };
  },

  async get(requestId: string): Promise<RequestSummary> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/requests/${encodeURIComponent(requestId)}`,
    );
    return assertRequest(response);
  },

  async create(payload: RequestInput): Promise<RequestSummary> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/requests', payload);
    return assertRequest(response);
  },

  async update(requestId: string, payload: Partial<RequestInput>): Promise<RequestSummary> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/requests/${encodeURIComponent(requestId)}`,
      payload,
    );
    return assertRequest(response);
  },

  async submit(requestId: string): Promise<RequestSummary> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/requests/${encodeURIComponent(requestId)}/submit`,
    );
    return assertRequest(response);
  },

  async resubmit(requestId: string): Promise<RequestSummary> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/requests/${encodeURIComponent(requestId)}/resubmit`,
    );
    return assertRequest(response);
  },

  async cancel(requestId: string, cancellationReason: string): Promise<RequestSummary> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      `/requests/${encodeURIComponent(requestId)}/cancel`,
      { cancellationReason },
    );
    return assertRequest(response);
  },

  async progress(requestId: string): Promise<ApprovalProgress> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/requests/${encodeURIComponent(requestId)}/approval-progress`,
    );
    const data = assertRecord(response);
    if (!isRequest(data.request) || typeof data.attemptNumber !== 'number') {
      throw new Error('The approval progress API returned an unsupported response.');
    }
    return data as unknown as ApprovalProgress;
  },

  async history(requestId: string): Promise<ApprovalHistory> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/requests/${encodeURIComponent(requestId)}/approval-history`,
    );
    const data = assertRecord(response);
    if (!isRequest(data.request) || !Array.isArray(data.timeline)) {
      throw new Error('The approval history API returned an unsupported response.');
    }
    return data as unknown as ApprovalHistory;
  },
};
