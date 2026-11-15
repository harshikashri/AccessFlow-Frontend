import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import { BULK_IMPORT_ROW_STATUSES } from '@/features/users/types/bulk-user.types';
import type {
  BulkDeactivationResult,
  BulkDeactivationStatus,
  BulkDeactivationUserResult,
  BulkMembershipResultStatus,
  BulkMembershipStatusResult,
  BulkMembershipTargetStatus,
  BulkMembershipUserResult,
  BulkImportErrorReport,
  BulkImportLimits,
  BulkImportPreview,
  BulkImportPreviewRow,
  BulkImportResult,
  BulkImportResultSummary,
  BulkImportSummary,
} from '@/features/users/types/bulk-user.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isScopeType(value: unknown): value is 'ORGANIZATION' | 'DEPARTMENT' {
  return value === 'ORGANIZATION' || value === 'DEPARTMENT';
}

function isImportRow(value: unknown): value is BulkImportPreviewRow {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.rowNumber) &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    typeof value.email === 'string' &&
    (value.department === null || typeof value.department === 'string') &&
    (value.role === null || typeof value.role === 'string') &&
    (value.scopeType === null || isScopeType(value.scopeType)) &&
    typeof value.status === 'string' &&
    BULK_IMPORT_ROW_STATUSES.includes(value.status as (typeof BULK_IMPORT_ROW_STATUSES)[number]) &&
    Array.isArray(value.errors) &&
    value.errors.every((error) => typeof error === 'string')
  );
}

function isImportLimits(value: unknown): value is BulkImportLimits {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.maxBytes) &&
    value.maxBytes > 0 &&
    isNonNegativeInteger(value.maxRows) &&
    value.maxRows > 0
  );
}

function isImportSummary(value: unknown): value is BulkImportSummary {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.totalRows) &&
    isNonNegativeInteger(value.validUsers) &&
    isNonNegativeInteger(value.existingUsers) &&
    isNonNegativeInteger(value.invalidUsers) &&
    isNonNegativeInteger(value.validAssignments) &&
    isNonNegativeInteger(value.invalidRows) &&
    isNonNegativeInteger(value.duplicateRows)
  );
}

function isPreview(value: unknown): value is BulkImportPreview {
  return (
    isRecord(value) &&
    isImportLimits(value.limits) &&
    isImportSummary(value.summary) &&
    Array.isArray(value.rows) &&
    value.rows.every(isImportRow)
  );
}

function isImportResultSummary(value: unknown): value is BulkImportResultSummary {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.totalRows) &&
    isNonNegativeInteger(value.usersCreated) &&
    isNonNegativeInteger(value.assignmentsCreated) &&
    isNonNegativeInteger(value.failedAssignments) &&
    isNonNegativeInteger(value.existingUsersSkipped) &&
    isNonNegativeInteger(value.invalidUsersSkipped) &&
    isNonNegativeInteger(value.failedUsers) &&
    isRecord(value.invitations) &&
    isNonNegativeInteger(value.invitations.sent) &&
    isNonNegativeInteger(value.invitations.failed)
  );
}

function isErrorReport(value: unknown): value is BulkImportErrorReport {
  return (
    isRecord(value) &&
    typeof value.filename === 'string' &&
    typeof value.contentType === 'string' &&
    typeof value.csv === 'string'
  );
}

function isImportResult(value: unknown): value is BulkImportResult {
  return (
    isRecord(value) &&
    typeof value.importId === 'string' &&
    isImportResultSummary(value.summary) &&
    Array.isArray(value.rows) &&
    value.rows.every(isImportRow) &&
    isErrorReport(value.errorReport)
  );
}

function isDeactivationStatus(value: unknown): value is BulkDeactivationStatus {
  return value === 'DEACTIVATED' || value === 'ALREADY_INACTIVE' || value === 'FAILED';
}

function isDeactivationResultItem(value: unknown): value is BulkDeactivationUserResult {
  return (
    isRecord(value) &&
    typeof value.userId === 'string' &&
    isDeactivationStatus(value.status) &&
    typeof value.message === 'string' &&
    (value.code === undefined || typeof value.code === 'string')
  );
}

function isDeactivationSummary(value: unknown): value is BulkDeactivationResult['summary'] {
  return (
    isRecord(value) &&
    Object.keys(value).length === 3 &&
    'requested' in value &&
    isNonNegativeInteger(value.requested) &&
    'deactivated' in value &&
    isNonNegativeInteger(value.deactivated) &&
    'failed' in value &&
    isNonNegativeInteger(value.failed)
  );
}

function isDeactivationResponse(value: unknown): value is BulkDeactivationResult {
  return (
    isRecord(value) &&
    isDeactivationSummary(value.summary) &&
    Array.isArray(value.results) &&
    value.results.every(isDeactivationResultItem)
  );
}

function isMembershipResultStatus(value: unknown): value is BulkMembershipResultStatus {
  return (
    value === 'ACTIVATED' ||
    value === 'ALREADY_ACTIVE' ||
    value === 'DEACTIVATED' ||
    value === 'ALREADY_INACTIVE' ||
    value === 'FAILED'
  );
}

function isMembershipResultItem(value: unknown): value is BulkMembershipUserResult {
  return (
    isRecord(value) &&
    typeof value.userId === 'string' &&
    isMembershipResultStatus(value.status) &&
    typeof value.message === 'string' &&
    (value.code === undefined || typeof value.code === 'string')
  );
}

function isMembershipSummary(value: unknown): value is BulkMembershipStatusResult['summary'] {
  return (
    isRecord(value) &&
    Object.keys(value).length === 4 &&
    isNonNegativeInteger(value.requested) &&
    isNonNegativeInteger(value.activated) &&
    isNonNegativeInteger(value.deactivated) &&
    isNonNegativeInteger(value.failed)
  );
}

function isMembershipStatusResponse(value: unknown): value is BulkMembershipStatusResult {
  return (
    isRecord(value) &&
    isMembershipSummary(value.summary) &&
    Array.isArray(value.results) &&
    value.results.every(isMembershipResultItem)
  );
}

function getApiData(response: AxiosResponse<unknown>): unknown {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The bulk user API returned an unsupported response.');
  }
  return response.data.data;
}

function assertApiData<T>(
  response: AxiosResponse<unknown>,
  isExpected: (value: unknown) => value is T,
): T {
  const data = getApiData(response);
  if (!isExpected(data)) throw new Error('The bulk user API returned an unsupported response.');
  return data;
}

function createFileForm(file: File): FormData {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export const bulkUserService = {
  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>('/users/bulk-import/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  async validateImport(file: File): Promise<BulkImportPreview> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      '/users/bulk-import/validate',
      createFileForm(file),
    );
    return assertApiData(response, isPreview);
  },

  async confirmImport(file: File): Promise<BulkImportResult> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      '/users/bulk-import/confirm',
      createFileForm(file),
    );
    return assertApiData(response, isImportResult);
  },

  async downloadFailedReport(file: File): Promise<Blob> {
    const response = await apiClient.post<Blob>(
      '/users/bulk-import/failed-report',
      createFileForm(file),
      { responseType: 'blob' },
    );
    return response.data;
  },

  async deactivateUsers(userIds: string[]): Promise<BulkDeactivationResult> {
    const requestedIds = [...new Set(userIds)];
    const response = await apiClient.post<ApiEnvelope<unknown>>('/users/bulk-deactivate', {
      userIds: requestedIds,
    });
    const data = getApiData(response);
    if (!isDeactivationResponse(data)) {
      throw new Error('The bulk user API returned an unsupported response.');
    }
    const resultIds = new Set(data.results.map((result) => result.userId));
    if (
      data.results.length !== requestedIds.length ||
      resultIds.size !== requestedIds.length ||
      requestedIds.some((userId) => !resultIds.has(userId))
    ) {
      throw new Error('The bulk user API returned an incomplete deactivation result.');
    }
    return { summary: data.summary, results: data.results };
  },

  async changeMembershipStatus(
    userIds: string[],
    status: BulkMembershipTargetStatus,
  ): Promise<BulkMembershipStatusResult> {
    const requestedIds = [...new Set(userIds)];
    const response = await apiClient.post<ApiEnvelope<unknown>>('/users/bulk-membership-status', {
      userIds: requestedIds,
      status,
    });
    const data = getApiData(response);
    if (!isMembershipStatusResponse(data)) {
      throw new Error('The bulk user API returned an unsupported response.');
    }
    const resultIds = new Set(data.results.map((result) => result.userId));
    if (
      data.results.length !== requestedIds.length ||
      resultIds.size !== requestedIds.length ||
      requestedIds.some((userId) => !resultIds.has(userId))
    ) {
      throw new Error('The bulk user API returned an incomplete membership status result.');
    }
    return { summary: data.summary, results: data.results };
  },
};
