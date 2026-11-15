import type { UserScopeType } from '@/features/users/types/user.types';

export const BULK_IMPORT_ROW_STATUSES = [
  'VALID',
  'EXISTING',
  'ALREADY_EXISTS',
  'INVALID',
  'DUPLICATE',
  'CREATED',
  'IMPORTED',
  'INVITATION_FAILED',
  'FAILED',
  'SKIPPED',
] as const;

export type BulkImportRowStatus = (typeof BULK_IMPORT_ROW_STATUSES)[number];
export type BulkImportRowFilter = 'ALL' | 'VALID' | 'INVALID' | 'EXISTING' | 'DUPLICATE';

export interface BulkImportLimits {
  maxBytes: number;
  maxRows: number;
}

export interface BulkImportPreviewRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  role: string | null;
  scopeType: UserScopeType | null;
  status: BulkImportRowStatus;
  errors: string[];
}

export interface BulkImportSummary {
  totalRows: number;
  validUsers: number;
  existingUsers: number;
  invalidUsers: number;
  validAssignments: number;
  invalidRows: number;
  duplicateRows: number;
}

export interface BulkImportPreview {
  limits: BulkImportLimits;
  summary: BulkImportSummary;
  rows: BulkImportPreviewRow[];
}

export interface BulkImportResultSummary {
  totalRows: number;
  usersCreated: number;
  assignmentsCreated: number;
  failedAssignments: number;
  existingUsersSkipped: number;
  invalidUsersSkipped: number;
  failedUsers: number;
  invitations: {
    sent: number;
    failed: number;
  };
}

export interface BulkImportErrorReport {
  filename: string;
  contentType: string;
  csv: string;
}

export interface BulkImportResult {
  importId: string;
  summary: BulkImportResultSummary;
  rows: BulkImportPreviewRow[];
  errorReport: BulkImportErrorReport;
}

export type BulkDeactivationStatus = 'DEACTIVATED' | 'ALREADY_INACTIVE' | 'FAILED';

export interface BulkDeactivationUserResult {
  userId: string;
  status: BulkDeactivationStatus;
  message: string;
  code?: string;
}

export interface BulkDeactivationResult {
  summary: {
    requested: number;
    deactivated: number;
    failed: number;
  };
  results: BulkDeactivationUserResult[];
}

export type BulkMembershipTargetStatus = 'ACTIVE' | 'INACTIVE';
export type BulkMembershipResultStatus =
  'ACTIVATED' | 'ALREADY_ACTIVE' | 'DEACTIVATED' | 'ALREADY_INACTIVE' | 'FAILED';

export interface BulkMembershipUserResult {
  userId: string;
  status: BulkMembershipResultStatus;
  message: string;
  code?: string;
}

export interface BulkMembershipStatusResult {
  summary: {
    requested: number;
    activated: number;
    deactivated: number;
    failed: number;
  };
  results: BulkMembershipUserResult[];
}
