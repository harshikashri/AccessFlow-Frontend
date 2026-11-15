import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import type {
  AuditListParams,
  AuditListResponse,
  AuditLog,
  AuditStatistics,
} from '../types/audit-log.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const dataOf = (response: AxiosResponse<unknown>): unknown => {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The audit API returned an unsupported response.');
  }
  return response.data.data;
};

const isAuditLog = (value: unknown): value is AuditLog =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.action === 'string' &&
  typeof value.resourceType === 'string' &&
  typeof value.resourceId === 'string' &&
  typeof value.timestamp === 'string';

const paramsOf = (params: AuditListParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );

const list = async (params: AuditListParams, signal?: AbortSignal): Promise<AuditListResponse> => {
  const response = await apiClient.get<ApiEnvelope<unknown>>('/audit-logs', {
    params: paramsOf(params),
    ...(signal ? { signal } : {}),
  });
  const data = dataOf(response);
  if (
    !isRecord(data) ||
    !Array.isArray(data.items) ||
    !data.items.every(isAuditLog) ||
    !isRecord(data.pagination)
  ) {
    throw new Error('The audit log list returned an unsupported response.');
  }
  return data as unknown as AuditListResponse;
};

const get = async (id: string): Promise<AuditLog> => {
  const response = await apiClient.get<ApiEnvelope<unknown>>(
    `/audit-logs/${encodeURIComponent(id)}`,
  );
  const data = dataOf(response);
  if (!isAuditLog(data)) throw new Error('The audit detail returned an unsupported response.');
  return data;
};

const statistics = async (): Promise<AuditStatistics> => {
  const response = await apiClient.get<ApiEnvelope<unknown>>('/audit-logs/statistics');
  const data = dataOf(response);
  if (
    !isRecord(data) ||
    typeof data.total !== 'number' ||
    typeof data.today !== 'number' ||
    typeof data.week !== 'number' ||
    !Array.isArray(data.byAction)
  ) {
    throw new Error('The audit statistics returned an unsupported response.');
  }
  return data as unknown as AuditStatistics;
};

const exportCsv = async (params: AuditListParams) => {
  const response = await apiClient.get<Blob>('/audit-logs/export', {
    params: paramsOf(params),
    responseType: 'blob',
  });
  return response.data;
};

export const auditLogService = { list, get, statistics, exportCsv };
