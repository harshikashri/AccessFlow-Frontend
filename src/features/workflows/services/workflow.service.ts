import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import type {
  Workflow,
  WorkflowCondition,
  WorkflowConditionOperator,
  WorkflowInput,
  WorkflowListParams,
  WorkflowListResponse,
} from '../types/workflow.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getData(response: AxiosResponse<unknown>): unknown {
  if (!isRecord(response.data) || response.data.success !== true || !('data' in response.data)) {
    throw new Error('The workflow API returned an unsupported response.');
  }
  return response.data.data;
}

const CONDITION_OPERATORS = new Set<WorkflowConditionOperator>([
  'EQUALS',
  'NOT_EQUALS',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'CONTAINS',
  'NOT_CONTAINS',
  'IN',
  'NOT_IN',
  'IS_EMPTY',
  'IS_NOT_EMPTY',
  'IS_TRUE',
  'IS_FALSE',
]);

function isWorkflowCondition(value: unknown, depth = 0): value is WorkflowCondition {
  if (!isRecord(value) || depth > 3) return false;
  if ('conditions' in value) {
    return (
      (value.operator === 'AND' || value.operator === 'OR') &&
      Array.isArray(value.conditions) &&
      value.conditions.length > 0 &&
      value.conditions.length <= 10 &&
      value.conditions.every((condition) => isWorkflowCondition(condition, depth + 1))
    );
  }
  return (
    typeof value.field === 'string' &&
    typeof value.operator === 'string' &&
    CONDITION_OPERATORS.has(value.operator as WorkflowConditionOperator) &&
    'value' in value
  );
}

function isStage(value: unknown): boolean {
  const condition = isRecord(value) && value.condition;
  const hasValidCondition =
    condition === null || condition === undefined || isWorkflowCondition(condition);
  return (
    isRecord(value) &&
    typeof value.stageId === 'string' &&
    typeof value.sequence === 'number' &&
    typeof value.name === 'string' &&
    typeof value.approverType === 'string' &&
    isRecord(value.assignment) &&
    typeof value.assignment.type === 'string' &&
    typeof value.assignment.resolution === 'string' &&
    hasValidCondition
  );
}

function isWorkflow(value: unknown): value is Workflow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.organizationId === 'string' &&
    value.definitionType === 'APPROVAL_WORKFLOW' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    (value.requestTypeId === null || typeof value.requestTypeId === 'string') &&
    (value.selectionCondition === null || isWorkflowCondition(value.selectionCondition)) &&
    typeof value.priority === 'number' &&
    typeof value.version === 'number' &&
    typeof value.isDefault === 'boolean' &&
    typeof value.isActive === 'boolean' &&
    Array.isArray(value.stages) &&
    value.stages.every(isStage) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function assertWorkflow(response: AxiosResponse<unknown>): Workflow {
  const data = getData(response);
  if (!isWorkflow(data)) throw new Error('The workflow API returned an unsupported response.');
  return data;
}

function toParams(params: WorkflowListParams): Record<string, string> {
  return {
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    ...(params.isActive === undefined ? {} : { isActive: String(params.isActive) }),
    ...(params.requestTypeId ? { requestTypeId: params.requestTypeId } : {}),
  };
}

export const workflowService = {
  async list(params: WorkflowListParams): Promise<WorkflowListResponse> {
    const response = await apiClient.get<ApiEnvelope<unknown>>('/approval-workflows', {
      params: toParams(params),
    });
    const data = getData(response);
    if (
      !isRecord(data) ||
      !Array.isArray(data.items) ||
      !data.items.every(isWorkflow) ||
      !isRecord(data.pagination)
    ) {
      throw new Error('The workflow API returned an unsupported response.');
    }
    return {
      items: data.items,
      pagination: data.pagination as WorkflowListResponse['pagination'],
    };
  },

  async get(workflowId: string): Promise<Workflow> {
    const response = await apiClient.get<ApiEnvelope<unknown>>(
      `/approval-workflows/${encodeURIComponent(workflowId)}`,
    );
    return assertWorkflow(response);
  },

  async create(payload: WorkflowInput): Promise<Workflow> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/approval-workflows', payload);
    return assertWorkflow(response);
  },

  async update(workflowId: string, payload: WorkflowInput): Promise<Workflow> {
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/approval-workflows/${encodeURIComponent(workflowId)}`,
      payload,
    );
    return assertWorkflow(response);
  },

  async setStatus(workflowId: string, isActive: boolean): Promise<Workflow> {
    const action = isActive ? 'activate' : 'deactivate';
    const response = await apiClient.patch<ApiEnvelope<unknown>>(
      `/approval-workflows/${encodeURIComponent(workflowId)}/${action}`,
    );
    return assertWorkflow(response);
  },

  async validate(payload: WorkflowInput): Promise<{ valid: boolean }> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      '/approval-workflows/validate',
      payload,
    );
    const data = getData(response);
    if (!isRecord(data) || data.valid !== true) {
      throw new Error('The workflow validation API returned an unsupported response.');
    }
    return { valid: true };
  },
};
