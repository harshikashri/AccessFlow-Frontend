export type RequestStatus =
  'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'RETURNED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RequestFieldType =
  'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'CHECKBOX';

export interface RequestFieldValidation {
  min?: number;
  max?: number;
  integer?: boolean;
  integerOnly?: boolean;
  positiveOnly?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minDate?: string;
  maxDate?: string;
  notPast?: boolean;
  notInPast?: boolean;
  notInFuture?: boolean;
  gteField?: string;
  minSelections?: number;
  maxSelections?: number;
}

export interface RequestField {
  key: string;
  label: string;
  description: string;
  type: RequestFieldType;
  semantic: 'AMOUNT' | null;
  required: boolean;
  placeholder: string;
  options?: string[];
  validation?: RequestFieldValidation;
  visibleWhen?: { field: string; operator: string; value: unknown } | null;
  requiredWhen?: { field: string; operator: string; value: unknown } | null;
  displayOrder: number;
}

export interface RequestType {
  id: string;
  organizationId: string;
  definitionType: 'REQUEST_TYPE';
  name: string;
  code: string;
  description: string;
  fields: RequestField[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestAttachment {
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  checksum: string | null;
  uploadedAt?: string;
}

export interface RequestSummary {
  id: string;
  organizationId: string;
  requestNumber: string;
  requesterId: string;
  departmentId: string | null;
  requestTypeId: string | null;
  requestType: string;
  requestTypeCode: string | null;
  requestTypeName: string | null;
  title: string;
  description: string;
  priority: RequestPriority;
  amount: number | null;
  details: Record<string, unknown>;
  attachments: RequestAttachment[];
  status: RequestStatus;
  workflowDefinitionId: string | null;
  currentSequence: number;
  submittedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  returnedAt: string | null;
  returnedBy: string | null;
  returnReason: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: { id: string; name: string; email: string } | null;
  department?: { id: string; name: string } | null;
  currentApprovalStage?: {
    stageId: string;
    stageName: string;
    sequence: number;
    status: string;
    approver: { id: string; name: string | null } | null;
    claimedBy: string | null;
  } | null;
  waitingForMe?: boolean;
  hasActed?: boolean;
}

export interface RequestPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface RequestListResponse {
  items: RequestSummary[];
  pagination: RequestPagination;
}

export interface RequestListParams {
  page: number;
  limit: number;
  search: string;
  status?: RequestStatus;
  requestTypeId?: string;
  departmentId?: string;
  requesterId?: string;
  derivedFilter?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface RequestInput {
  departmentId?: string;
  requestTypeId: string;
  title: string;
  description: string;
  priority: RequestPriority;
  details: Record<string, unknown>;
  attachments: RequestAttachment[];
}

export interface ApprovalProgress {
  request: RequestSummary;
  attemptNumber: number;
  currentStage: { sequence: number; stageId: string; stageName: string; status: string } | null;
  stages?: {
    sequence: number;
    stageId: string;
    stageName: string;
    description: string;
    status: string;
    approverType: string;
    approverRoleName: string | null;
    approverNames: string[];
    approvalMode: string;
    scopeType: string | null;
    slaDueAt: string | null;
    comments: string[];
  }[];
  totalApplicableStages: number;
  completedStages: number[];
  pendingStages: number[];
  skippedStages: { sequence: number; stageId: string; stageName: string }[];
  submittedAt: string | null;
  updatedAt: string;
}

export interface ApprovalHistoryEvent {
  type: string;
  actorId: string | null;
  actorName?: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ApprovalHistory {
  request: RequestSummary;
  timeline: ApprovalHistoryEvent[];
}
