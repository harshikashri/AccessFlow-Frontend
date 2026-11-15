import { Button, Input, Select } from '@/components/ui';
import type { RequestField } from '@/features/requests/types/request.types';
import type {
  WorkflowCondition,
  WorkflowConditionGroup,
  WorkflowConditionOperator,
  WorkflowConditionRule,
} from '../types/workflow.types';

const GROUP_OPERATORS = [
  { value: 'AND', label: 'All conditions match (AND)' },
  { value: 'OR', label: 'Any condition matches (OR)' },
];

const OPERATOR_LABELS: Record<WorkflowConditionOperator, string> = {
  EQUALS: 'Equals',
  NOT_EQUALS: 'Does not equal',
  GREATER_THAN: 'Greater than',
  GREATER_THAN_OR_EQUAL: 'Greater than or equal to',
  LESS_THAN: 'Less than',
  LESS_THAN_OR_EQUAL: 'Less than or equal to',
  CONTAINS: 'Contains',
  NOT_CONTAINS: 'Does not contain',
  IN: 'Is one of',
  NOT_IN: 'Is not one of',
  IS_EMPTY: 'Is empty',
  IS_NOT_EMPTY: 'Is not empty',
  IS_TRUE: 'Is true',
  IS_FALSE: 'Is false',
};

const VALUELESS_OPERATORS = new Set<WorkflowConditionOperator>([
  'IS_EMPTY',
  'IS_NOT_EMPTY',
  'IS_TRUE',
  'IS_FALSE',
]);

const isGroup = (condition: WorkflowCondition): condition is WorkflowConditionGroup =>
  'conditions' in condition && Array.isArray(condition.conditions);

function operatorsForField(field: RequestField | undefined): WorkflowConditionOperator[] {
  if (!field) return ['EQUALS', 'NOT_EQUALS', 'IS_EMPTY', 'IS_NOT_EMPTY'];
  if (field.type === 'NUMBER') {
    return [
      'EQUALS',
      'NOT_EQUALS',
      'GREATER_THAN',
      'GREATER_THAN_OR_EQUAL',
      'LESS_THAN',
      'LESS_THAN_OR_EQUAL',
      'IS_EMPTY',
      'IS_NOT_EMPTY',
    ];
  }
  if (field.type === 'DATE') {
    return [
      'EQUALS',
      'NOT_EQUALS',
      'GREATER_THAN',
      'GREATER_THAN_OR_EQUAL',
      'LESS_THAN',
      'LESS_THAN_OR_EQUAL',
      'IS_EMPTY',
      'IS_NOT_EMPTY',
    ];
  }
  if (field.type === 'CHECKBOX') {
    return ['EQUALS', 'NOT_EQUALS', 'IS_TRUE', 'IS_FALSE'];
  }
  if (field.type === 'SELECT') {
    return ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'IS_EMPTY', 'IS_NOT_EMPTY'];
  }
  if (field.type === 'MULTI_SELECT') {
    return ['CONTAINS', 'NOT_CONTAINS', 'IN', 'NOT_IN', 'IS_EMPTY', 'IS_NOT_EMPTY'];
  }
  return ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'IS_EMPTY', 'IS_NOT_EMPTY'];
}

function firstRule(fields: RequestField[]): WorkflowConditionRule {
  const field = fields[0];
  return {
    field: field?.key ?? '',
    operator: 'EQUALS',
    value: field?.type === 'CHECKBOX' ? false : '',
  };
}

function withNewRule(condition: WorkflowCondition, fields: RequestField[]): WorkflowCondition {
  const rule = firstRule(fields);
  if (!isGroup(condition)) return { operator: 'AND', conditions: [condition, rule] };
  return { ...condition, conditions: [...condition.conditions, rule] };
}

function updateGroupChild(
  group: WorkflowConditionGroup,
  index: number,
  next: WorkflowCondition | null,
): WorkflowCondition | null {
  const conditions = group.conditions.flatMap((condition, childIndex) =>
    childIndex === index && next === null ? [] : [childIndex === index ? next! : condition],
  );
  if (!conditions.length) return null;
  if (conditions.length === 1) return conditions[0] ?? null;
  return { ...group, conditions };
}

function RuleEditor({
  condition,
  fields,
  disabled,
  onChange,
}: {
  condition: WorkflowConditionRule;
  fields: RequestField[];
  disabled: boolean;
  onChange: (condition: WorkflowConditionRule) => void;
}) {
  const field = fields.find((item) => item.key === condition.field);
  const operators = operatorsForField(field);
  const operator = operators.includes(condition.operator)
    ? condition.operator
    : (operators[0] ?? 'EQUALS');

  function setField(key: string) {
    const nextField = fields.find((item) => item.key === key);
    const nextOperator = operatorsForField(nextField)[0] ?? 'EQUALS';
    onChange({
      field: key,
      operator: nextOperator,
      value: nextField?.type === 'CHECKBOX' ? false : '',
    });
  }

  function setValue(value: unknown) {
    onChange({ ...condition, operator, value });
  }

  const valueControl = () => {
    if (VALUELESS_OPERATORS.has(operator)) return null;
    if ((operator === 'IN' || operator === 'NOT_IN') && field?.options?.length) {
      return (
        <label className="ui-field">
          <span className="ui-field__label">Values</span>
          <select
            className="ui-select"
            multiple
            size={Math.min(field.options.length, 5)}
            value={Array.isArray(condition.value) ? condition.value.map(String) : []}
            onChange={(event) =>
              setValue(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
            }
            disabled={disabled}
          >
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }
    if (field?.type === 'CHECKBOX') {
      return (
        <Select
          label="Value"
          value={String(condition.value ?? '')}
          onChange={(event) => setValue(event.target.value === 'true')}
          options={[
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ]}
          disabled={disabled}
        />
      );
    }
    if ((field?.type === 'SELECT' || field?.type === 'MULTI_SELECT') && field.options?.length) {
      return (
        <Select
          label="Value"
          value={typeof condition.value === 'string' ? condition.value : ''}
          onChange={(event) => setValue(event.target.value)}
          options={field.options.map((option) => ({ value: option, label: option }))}
          disabled={disabled}
        />
      );
    }
    const inputType =
      field?.type === 'NUMBER' || field?.semantic === 'AMOUNT'
        ? 'number'
        : field?.type === 'DATE'
          ? 'date'
          : 'text';
    return (
      <Input
        label="Value"
        type={inputType}
        value={
          condition.value === null || condition.value === undefined ? '' : String(condition.value)
        }
        onChange={(event) => {
          const value = event.target.value;
          setValue(inputType === 'number' && value !== '' ? Number(value) : value);
        }}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="workflow-condition-rule">
      <Select
        label="Request field"
        value={condition.field}
        onChange={(event) => setField(event.target.value)}
        options={fields.map((item) => ({ value: item.key, label: item.label }))}
        disabled={disabled || fields.length === 0}
      />
      <Select
        label="Comparison"
        value={operator}
        onChange={(event) => {
          const nextOperator = event.target.value as WorkflowConditionOperator;
          onChange({
            ...condition,
            operator: nextOperator,
            value: VALUELESS_OPERATORS.has(nextOperator)
              ? null
              : nextOperator === 'IN' || nextOperator === 'NOT_IN'
                ? Array.isArray(condition.value)
                  ? condition.value
                  : []
                : Array.isArray(condition.value)
                  ? (condition.value[0] ?? '')
                  : condition.value,
          });
        }}
        options={operators.map((value) => ({ value, label: OPERATOR_LABELS[value] }))}
        disabled={disabled || !field}
      />
      {valueControl()}
    </div>
  );
}

function ConditionNodeEditor({
  condition,
  fields,
  disabled,
  depth,
  onChange,
  onRemove,
}: {
  condition: WorkflowCondition;
  fields: RequestField[];
  disabled: boolean;
  depth: number;
  onChange: (condition: WorkflowCondition | null) => void;
  onRemove: () => void;
}) {
  if (!isGroup(condition)) {
    return (
      <div className="workflow-condition-node">
        <RuleEditor condition={condition} fields={fields} disabled={disabled} onChange={onChange} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange(withNewRule(condition, fields))}
          disabled={disabled || fields.length === 0 || depth >= 2}
        >
          Add condition
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onRemove} disabled={disabled}>
          Remove condition
        </Button>
      </div>
    );
  }

  return (
    <div className="workflow-condition-group">
      <div className="workflow-condition-group__header">
        <Select
          label="Condition logic"
          value={condition.operator}
          onChange={(event) =>
            onChange({
              ...condition,
              operator: event.target.value as WorkflowConditionGroup['operator'],
            })
          }
          options={GROUP_OPERATORS}
          disabled={disabled}
        />
        <Button type="button" size="sm" variant="ghost" onClick={onRemove} disabled={disabled}>
          Remove group
        </Button>
      </div>
      <div className="workflow-condition-group__children">
        {condition.conditions.map((child, index) => (
          <ConditionNodeEditor
            key={`${depth}-${index}`}
            condition={child}
            fields={fields}
            disabled={disabled}
            depth={depth + 1}
            onChange={(next) => onChange(updateGroupChild(condition, index, next))}
            onRemove={() => onChange(updateGroupChild(condition, index, null))}
          />
        ))}
      </div>
      <div className="workflow-condition-group__actions">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({
              ...condition,
              conditions: [...condition.conditions, firstRule(fields)],
            })
          }
          disabled={disabled || condition.conditions.length >= 10}
        >
          Add condition
        </Button>
        {depth < 2 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...condition,
                conditions: [
                  ...condition.conditions,
                  { operator: 'AND', conditions: [firstRule(fields)] },
                ],
              })
            }
            disabled={disabled || condition.conditions.length >= 10}
          >
            Add condition group
          </Button>
        )}
      </div>
    </div>
  );
}

export function WorkflowConditionBuilder({
  label,
  description,
  fields,
  value,
  disabled,
  error,
  onChange,
}: {
  label: string;
  description?: string;
  fields: RequestField[];
  value: WorkflowCondition | null;
  disabled: boolean;
  error?: string;
  onChange: (condition: WorkflowCondition | null) => void;
}) {
  return (
    <div className="workflow-condition-builder">
      <div className="workflow-condition-builder__heading">
        <div>
          <h4>{label}</h4>
          {description && <p>{description}</p>}
        </div>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            Clear conditions
          </Button>
        )}
      </div>
      {value ? (
        <ConditionNodeEditor
          condition={value}
          fields={fields}
          disabled={disabled}
          depth={0}
          onChange={onChange}
          onRemove={() => onChange(null)}
        />
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange(firstRule(fields))}
          disabled={disabled || fields.length === 0}
        >
          Add condition
        </Button>
      )}
      {fields.length === 0 && (
        <p className="workflow-condition-builder__empty">
          Select a request type with configurable fields to add conditions.
        </p>
      )}
      {error && (
        <p className="workflow-condition-builder__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
