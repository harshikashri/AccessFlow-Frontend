import type { RequestField } from '@/features/requests/types/request.types';
import type {
  WorkflowCondition,
  WorkflowConditionOperator,
  WorkflowStage,
} from '../types/workflow.types';

const VALUELESS_OPERATORS = new Set<WorkflowConditionOperator>([
  'IS_EMPTY',
  'IS_NOT_EMPTY',
  'IS_TRUE',
  'IS_FALSE',
]);

const OPERATOR_LABELS: Record<WorkflowConditionOperator, string> = {
  EQUALS: 'equals',
  NOT_EQUALS: 'does not equal',
  GREATER_THAN: 'is greater than',
  GREATER_THAN_OR_EQUAL: 'is greater than or equal to',
  LESS_THAN: 'is less than',
  LESS_THAN_OR_EQUAL: 'is less than or equal to',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'does not contain',
  IN: 'is one of',
  NOT_IN: 'is not one of',
  IS_EMPTY: 'is empty',
  IS_NOT_EMPTY: 'is not empty',
  IS_TRUE: 'is true',
  IS_FALSE: 'is false',
};

function isConditionGroup(
  condition: WorkflowCondition,
): condition is Extract<WorkflowCondition, { conditions: WorkflowCondition[] }> {
  return 'conditions' in condition && Array.isArray(condition.conditions);
}

function formatValue(value: unknown, field: Pick<RequestField, 'semantic'> | undefined) {
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'number' && field?.semantic === 'AMOUNT') {
    return `₹${new Intl.NumberFormat('en-IN').format(value)}`;
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value ?? '');
}

function formatFieldKey(key: string) {
  if (key === 'amount') return 'Estimated budget';
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatWorkflowCondition(
  condition: WorkflowCondition | null | undefined,
  fields: RequestField[],
  depth = 0,
): string {
  if (!condition) return 'Always applies';
  if (isConditionGroup(condition)) {
    const formatted = condition.conditions
      .map((child) => formatWorkflowCondition(child, fields, depth + 1))
      .join(condition.operator === 'AND' ? ' AND ' : ' OR ');
    return depth > 0 ? `(${formatted})` : formatted;
  }
  const field =
    fields.find((item) => item.key === condition.field) ??
    (condition.field === 'amount'
      ? { key: 'amount', label: 'Estimated budget', semantic: 'AMOUNT' as const }
      : undefined);
  const operator = OPERATOR_LABELS[condition.operator] ?? condition.operator;
  const value = VALUELESS_OPERATORS.has(condition.operator)
    ? ''
    : ` ${formatValue(condition.value, field)}`;
  return `${field?.label ?? formatFieldKey(condition.field)} ${operator}${value}`;
}

export function isWorkflowConditionComplete(
  condition: WorkflowCondition | null,
  fields: RequestField[],
  depth = 0,
): boolean {
  if (!condition) return true;
  if (depth > 3) return false;
  if (isConditionGroup(condition)) {
    return (
      ['AND', 'OR'].includes(condition.operator) &&
      condition.conditions.length > 0 &&
      condition.conditions.length <= 10 &&
      condition.conditions.every((child) => isWorkflowConditionComplete(child, fields, depth + 1))
    );
  }
  const field = fields.find((item) => item.key === condition.field);
  if (!field) return false;
  if (VALUELESS_OPERATORS.has(condition.operator)) return true;
  if (condition.value === '' || condition.value === undefined || condition.value === null) {
    return false;
  }
  if (field.type === 'NUMBER') {
    return typeof condition.value === 'number' && Number.isFinite(condition.value);
  }
  if (field.type === 'CHECKBOX') return typeof condition.value === 'boolean';
  if (field.type === 'SELECT') {
    if (condition.operator === 'IN' || condition.operator === 'NOT_IN') {
      return (
        Array.isArray(condition.value) &&
        condition.value.length > 0 &&
        condition.value.every((value) => field.options?.includes(String(value)) === true)
      );
    }
    return typeof condition.value === 'string' && field.options?.includes(condition.value) === true;
  }
  if (
    field.type === 'MULTI_SELECT' &&
    (condition.operator === 'IN' || condition.operator === 'NOT_IN') &&
    Array.isArray(condition.value)
  ) {
    return (
      condition.value.length > 0 &&
      condition.value.every((value) => field.options?.includes(String(value)) === true)
    );
  }
  if (field.type === 'DATE') {
    return typeof condition.value === 'string' && !Number.isNaN(Date.parse(condition.value));
  }
  return typeof condition.value === 'string';
}

export function serializeWorkflowStages(stages: WorkflowStage[]): WorkflowStage[] {
  return stages.map((stage, index) => ({
    ...stage,
    sequence: index + 1,
    assignment: {
      ...stage.assignment,
      type: stage.approverType,
      roleId: stage.approverType === 'ROLE' ? stage.assignment.roleId : null,
      userId: null,
    },
    roleId: stage.approverType === 'ROLE' ? stage.assignment.roleId : null,
    condition: stage.condition,
  }));
}
