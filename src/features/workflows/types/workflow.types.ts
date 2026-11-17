import type { RequestType } from '@/features/requests/types/request.types';

export type WorkflowApproverType = 'DEPARTMENT_MANAGER' | 'ROLE' | 'USER' | 'ORGANIZATION_ADMIN';
export type WorkflowScope = 'DEPARTMENT' | 'ORGANIZATION';
export type WorkflowApprovalMode = 'ANY' | 'ALL';
export type WorkflowResolution = 'DIRECT' | 'CLAIM_ONE';
export type WorkflowAssignmentScope = 'DEPARTMENT' | 'ORGANIZATION' | 'ORGANIZATION_OR_DEPARTMENT';
export type WorkflowConditionGroupOperator = 'AND' | 'OR';
export type WorkflowConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'IN'
  | 'NOT_IN'
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY'
  | 'IS_TRUE'
  | 'IS_FALSE';

export type WorkflowSlaUnit = 'MINUTES' | 'HOURS' | 'DAYS';

export interface WorkflowAssignment {
  type: WorkflowApproverType;
  resolution: WorkflowResolution;
  scopeType?: WorkflowAssignmentScope;
  roleId: string | null;
  userId: string | null;
}

export interface WorkflowConditionRule {
  field: string;
  operator: WorkflowConditionOperator;
  value: unknown;
}

export interface WorkflowConditionGroup {
  operator: WorkflowConditionGroupOperator;
  conditions: WorkflowCondition[];
}

export type WorkflowCondition = WorkflowConditionRule | WorkflowConditionGroup;

export interface WorkflowSla {
  duration: number;
  unit: WorkflowSlaUnit;
  reminders?: { after: number; unit: WorkflowSlaUnit }[];
  escalation?: Record<string, unknown>;
  claimExpiry?: { duration: number; unit: WorkflowSlaUnit };
}

export interface WorkflowStage {
  stageId: string;
  sequence: number;
  name: string;
  description: string;
  approverType: WorkflowApproverType;
  assignment: WorkflowAssignment;
  approvalMode: WorkflowApprovalMode;
  isMandatory: boolean;
  isConfigurable: boolean;
  roleId: string | null;
  condition: WorkflowCondition | null;
  sla: WorkflowSla | null;
}

export interface Workflow {
  id: string;
  organizationId: string;
  definitionType: 'APPROVAL_WORKFLOW';
  name: string;
  description: string;
  requestTypeId: string | null;
  workflowScope: WorkflowScope;
  selectionCondition: WorkflowCondition | null;
  priority: number;
  version: number;
  isDefault: boolean;
  isActive: boolean;
  stages: WorkflowStage[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowListResponse {
  items: Workflow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WorkflowListParams {
  page: number;
  limit: number;
  search: string;
  isActive?: boolean;
  requestTypeId?: string;
}

export interface WorkflowInput {
  name: string;
  description: string;
  requestTypeId: string | null;
  workflowScope: WorkflowScope;
  isDefault: boolean;
  selectionCondition: WorkflowCondition | null;
  priority: number;
  stages: WorkflowStage[];
}

export interface WorkflowFormValues {
  name: string;
  description: string;
  requestTypeId: string;
  workflowScope: WorkflowScope;
  isDefault: boolean;
  selectionCondition: WorkflowCondition | null;
  priority: number;
  stages: WorkflowStage[];
}

export interface WorkflowFormErrors {
  name?: string;
  requestTypeId?: string;
  priority?: string;
  selectionCondition?: string;
  stages?: string;
}

export interface WorkflowEditorContext {
  requestTypes: RequestType[];
  roleOptions: { id: string; name: string }[];
}
