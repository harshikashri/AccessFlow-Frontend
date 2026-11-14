import type { RequestAttachment, RequestStatus } from '@/features/requests/types/request.types';

export type ApprovalStatus =
  'PENDING' | 'ACTIVE' | 'CLAIMED' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'SKIPPED' | 'CANCELLED';

export interface ApprovalRequestSummary {
  id: string;
  requestNumber: string;
  requestTypeId: string | null;
  requestTypeName: string | null;
  title: string;
  requesterId: string;
  departmentId: string;
  status: RequestStatus;
  currentSequence: number;
  submittedAt: string | null;
}

export interface ApprovalStep {
  id: string;
  organizationId: string;
  requestId: string;
  attemptNumber: number;
  workflowDefinitionId: string;
  workflowVersion: number;
  stageId: string;
  stageName: string;
  sequence: number;
  status: ApprovalStatus;
  approverId: string;
  claimedBy: string | null;
  claimedAt: string | null;
  claimExpiresAt: string | null;
  assignmentResolution: 'DIRECT' | 'CLAIM_ONE';
  approvalMode: 'ANY' | 'ALL';
  decidedBy: string | null;
  decisionAt: string | null;
  comments: string;
  returnedBy: string | null;
  returnedAt: string | null;
  slaDueAt: string | null;
  isOverdue?: boolean;
  request?: ApprovalRequestSummary | null;
}

export interface ApprovalPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApprovalInboxParams {
  page: number;
  limit: number;
  category?: 'available' | 'assigned' | 'pending_action' | 'completed' | 'all';
  status?: ApprovalStatus;
  requestTypeId?: string;
  departmentId?: string;
  sortBy: 'createdAt' | 'updatedAt' | 'decisionAt' | 'sequence' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface ApprovalInboxResponse {
  items: ApprovalStep[];
  pagination: ApprovalPagination;
}

export interface ApprovalDetails {
  approval: ApprovalStep;
  request: Record<string, unknown> & {
    _id?: string;
    title?: string;
    description?: string;
    status?: RequestStatus;
    details?: Record<string, unknown>;
    attachments?: RequestAttachment[];
    requesterId?: { _id?: string; name?: string; email?: string } | string;
    departmentId?: { _id?: string; name?: string; status?: string } | string;
  };
  workflow: { name?: string; version?: number; stages?: unknown[] } | null;
  history: ApprovalStep[];
}

export interface ApprovalDelegation {
  id: string;
  organizationId: string;
  delegatorId: string;
  delegateId: string;
  scopeType: 'ORGANIZATION' | 'DEPARTMENT';
  departmentId: string | null;
  stageIds: string[];
  startsAt: string;
  endsAt: string;
  status: 'ACTIVE' | 'REVOKED';
  revokedAt: string | null;
}
