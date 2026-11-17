import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, Input, Select, Textarea } from '@/components/ui';
import type { ManagedRole } from '@/features/roles/types/role.types';
import { getRoleSupportedScopes } from '@/features/roles/utils/role.utils';
import type { RequestField, RequestType } from '@/features/requests/types/request.types';
import type {
  WorkflowApproverType,
  WorkflowFormErrors,
  WorkflowFormValues,
  WorkflowInput,
  WorkflowSla,
  WorkflowSlaUnit,
  WorkflowStage,
  WorkflowScope,
} from '../types/workflow.types';
import {
  formatWorkflowCondition,
  isWorkflowConditionComplete,
  serializeWorkflowStages,
} from './workflow-form.utils';
import { WorkflowConditionBuilder } from './WorkflowConditionBuilder';

const SLA_UNITS: { value: WorkflowSlaUnit; label: string }[] = [
  { value: 'MINUTES', label: 'Minutes' },
  { value: 'HOURS', label: 'Hours' },
  { value: 'DAYS', label: 'Days' },
];

const DEFAULT_WORKFLOW_FIELDS: RequestField[] = [
  {
    key: 'amount',
    label: 'Estimated budget',
    description: 'The monetary amount used by the organization default workflow.',
    type: 'NUMBER',
    semantic: 'AMOUNT',
    required: false,
    placeholder: '',
    displayOrder: 0,
  },
];

function isValidSla(value: unknown): value is WorkflowSla {
  if (!value || typeof value !== 'object') return false;
  const sla = value as Partial<WorkflowSla>;
  return (
    typeof sla.duration === 'number' &&
    Number.isInteger(sla.duration) &&
    sla.duration > 0 &&
    SLA_UNITS.some((unit) => unit.value === sla.unit)
  );
}
const managerStage = (): WorkflowStage => ({
  stageId: `department-manager-${Date.now()}`,
  sequence: 1,
  name: 'Department Manager Approval',
  description: 'The request is reviewed by an eligible department manager.',
  approverType: 'DEPARTMENT_MANAGER',
  assignment: {
    type: 'DEPARTMENT_MANAGER',
    resolution: 'CLAIM_ONE',
    roleId: null,
    userId: null,
  },
  approvalMode: 'ANY',
  isMandatory: true,
  isConfigurable: false,
  roleId: null,
  condition: null,
  sla: null,
});

function createRoleStage(sequence: number): WorkflowStage {
  return {
    ...managerStage(),
    stageId: `approval-stage-${Date.now()}-${sequence}`,
    sequence,
    name: `Approval stage ${sequence}`,
    description: '',
    approverType: 'ROLE',
    assignment: {
      type: 'ROLE',
      resolution: 'CLAIM_ONE',
      roleId: null,
      userId: null,
    },
    isMandatory: false,
    isConfigurable: true,
  };
}

function validate(
  values: WorkflowFormValues,
  requestTypes: RequestType[],
  roles: ManagedRole[],
  allowDefaultWorkflow: boolean,
): WorkflowFormErrors {
  const errors: WorkflowFormErrors = {};
  if (values.name.trim().length < 2) errors.name = 'Workflow name must be at least 2 characters.';
  if (!values.isDefault && !values.requestTypeId) {
    errors.requestTypeId = 'Select a request type.';
  }
  if (values.isDefault && !allowDefaultWorkflow) {
    errors.requestTypeId = 'Only the organization default workflow can use the fallback scope.';
  }
  if (values.isDefault && values.selectionCondition) {
    errors.selectionCondition =
      'The organization default workflow cannot have a selection condition.';
  }
  if (values.isDefault && values.workflowScope !== 'DEPARTMENT') {
    errors.requestTypeId = 'The organization default workflow must be department-scoped.';
  }
  if (
    !values.isDefault &&
    (!Number.isInteger(values.priority) || values.priority < 0 || values.priority > 1000)
  ) {
    errors.priority = 'Priority must be a whole number between 0 and 1000.';
  }
  const requestFields = requestTypes.find((type) => type.id === values.requestTypeId)?.fields ?? [];
  if (
    values.selectionCondition &&
    !isWorkflowConditionComplete(values.selectionCondition, requestFields)
  ) {
    errors.selectionCondition =
      'Complete every workflow condition using a field from the selected request type.';
  }
  const managerStages = values.stages.filter(
    (stage) => stage.approverType === 'DEPARTMENT_MANAGER',
  );
  if (!values.stages.length) errors.stages = 'Add at least one approval stage.';
  else if (
    values.workflowScope === 'DEPARTMENT' &&
    (managerStages.length !== 1 || !managerStages[0]?.isMandatory)
  ) {
    errors.stages = 'Exactly one mandatory Department Manager stage is required.';
  } else if (values.workflowScope === 'DEPARTMENT' && managerStages[0]?.sequence !== 1) {
    errors.stages = 'Department Manager approval must be the first stage.';
  } else if (values.workflowScope === 'ORGANIZATION' && managerStages.length) {
    errors.stages = 'Organization-level workflows cannot include Department Manager stages.';
  }
  for (const stage of values.stages) {
    if (stage.approverType !== 'ROLE') continue;
    const role = roles.find((item) => item.id === stage.assignment.roleId);
    if (!role) {
      errors.stages = 'Select a role for every role-based approval stage.';
      break;
    }
    const supportedScopes = getRoleSupportedScopes(role);
    if (supportedScopes.length === 0) {
      errors.stages = `${role.name} has no configured assignment scope. Configure its supported scopes first.`;
      break;
    }
    if (values.workflowScope === 'ORGANIZATION' && !supportedScopes.includes('ORGANIZATION')) {
      errors.stages = `${role.name} does not support organization-wide assignments.`;
      break;
    }
    if (
      !stage.assignment.scopeType ||
      !supportedScopes.includes(stage.assignment.scopeType as 'ORGANIZATION' | 'DEPARTMENT') ||
      (values.workflowScope === 'ORGANIZATION' && stage.assignment.scopeType !== 'ORGANIZATION')
    ) {
      errors.stages = `Choose an exact scope supported by ${role.name} for every role-based approval stage.`;
      break;
    }
  }
  for (const stage of values.stages) {
    if (stage.sla && !isValidSla(stage.sla)) {
      errors.stages = 'SLA duration must be a positive whole number.';
      break;
    }
    if (stage.condition && !isWorkflowConditionComplete(stage.condition, requestFields)) {
      errors.stages =
        'Complete every stage condition using a field from the selected request type.';
      break;
    }
  }
  return errors;
}

interface Props {
  initialValues?: WorkflowFormValues;
  requestTypes: RequestType[];
  roles: ManagedRole[];
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (payload: WorkflowInput) => void | Promise<void>;
  allowDefaultWorkflow?: boolean;
  allowWorkflowTypeSelection?: boolean;
}

export function WorkflowForm({
  initialValues,
  requestTypes,
  roles,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
  allowDefaultWorkflow = false,
  allowWorkflowTypeSelection = false,
}: Props) {
  const [values, setValues] = useState<WorkflowFormValues>(
    initialValues
      ? {
          ...initialValues,
          workflowScope: initialValues.workflowScope ?? 'DEPARTMENT',
          isDefault: initialValues.isDefault ?? false,
          selectionCondition: initialValues.selectionCondition ?? null,
          priority: initialValues.priority ?? 0,
          stages: initialValues.stages.map((stage) => {
            const assignment = { ...stage.assignment };
            if (stage.approverType === 'ROLE') {
              const role = roles.find((item) => item.id === stage.assignment.roleId);
              const scopes = role
                ? getRoleSupportedScopes(role).filter(
                    (scope) =>
                      initialValues.workflowScope !== 'ORGANIZATION' || scope === 'ORGANIZATION',
                  )
                : [];
              const existingScope = stage.assignment.scopeType;
              const scopeType =
                scopes.length === 1
                  ? (scopes[0] ?? null)
                  : scopes.includes(existingScope as 'ORGANIZATION' | 'DEPARTMENT')
                    ? (existingScope ?? null)
                    : null;
              if (scopeType) assignment.scopeType = scopeType;
              else delete assignment.scopeType;
            }
            return {
              ...stage,
              assignment,
              sla: isValidSla(stage.sla) ? stage.sla : null,
            };
          }),
        }
      : {
          name: '',
          description: '',
          requestTypeId: '',
          workflowScope: 'DEPARTMENT',
          isDefault: false,
          selectionCondition: null,
          priority: 0,
          stages: [managerStage()],
        },
  );
  const [errors, setErrors] = useState<WorkflowFormErrors>({});

  function clearError(field: keyof WorkflowFormErrors) {
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateStage(index: number, patch: Partial<WorkflowStage>) {
    setValues((current) => ({
      ...current,
      stages: current.stages.map((stage, stageIndex) =>
        stageIndex === index
          ? {
              ...stage,
              ...patch,
              assignment: patch.assignment ?? stage.assignment,
            }
          : stage,
      ),
    }));
    clearError('stages');
  }

  function requestFields() {
    return (
      requestTypes.find((type) => type.id === values.requestTypeId)?.fields ??
      (values.isDefault ? DEFAULT_WORKFLOW_FIELDS : [])
    );
  }

  function updateWorkflowScope(workflowScope: WorkflowScope) {
    setValues((current) => {
      let stages = current.stages.filter(
        (stage) => workflowScope !== 'ORGANIZATION' || stage.approverType !== 'DEPARTMENT_MANAGER',
      );
      if (
        workflowScope === 'DEPARTMENT' &&
        !stages.some((stage) => stage.approverType === 'DEPARTMENT_MANAGER')
      ) {
        stages = [managerStage(), ...stages];
      }
      if (workflowScope === 'ORGANIZATION') {
        stages = stages.map((stage) => {
          if (stage.approverType !== 'ROLE') return stage;
          const role = roles.find((item) => item.id === stage.assignment.roleId);
          if (!role || !getRoleSupportedScopes(role).includes('ORGANIZATION')) return stage;
          return {
            ...stage,
            assignment: { ...stage.assignment, scopeType: 'ORGANIZATION' },
          };
        });
      }
      stages = stages.map((stage, index) => ({ ...stage, sequence: index + 1 }));
      if (!stages.length) stages = [createRoleStage(1)];
      return { ...current, workflowScope, stages };
    });
    clearError('stages');
  }

  function selectionFields() {
    return requestTypes.find((type) => type.id === values.requestTypeId)?.fields ?? [];
  }

  function moveStage(index: number, offset: -1 | 1) {
    const target = index + offset;
    const departmentWorkflow = values.workflowScope === 'DEPARTMENT';
    if (
      (departmentWorkflow && (index === 0 || target <= 0)) ||
      target < 0 ||
      target >= values.stages.length
    )
      return;
    setValues((current) => {
      const stages = [...current.stages];
      const [moved] = stages.splice(index, 1);
      if (!moved) return current;
      stages.splice(target, 0, moved);
      return {
        ...current,
        stages: stages.map((stage, stageIndex) => ({ ...stage, sequence: stageIndex + 1 })),
      };
    });
    clearError('stages');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(values, requestTypes, roles, allowDefaultWorkflow);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    void onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      requestTypeId: values.isDefault ? null : values.requestTypeId || null,
      workflowScope: values.isDefault ? 'DEPARTMENT' : values.workflowScope,
      isDefault: values.isDefault,
      selectionCondition: values.isDefault ? null : values.selectionCondition,
      priority: values.isDefault ? 0 : values.priority,
      stages: serializeWorkflowStages(values.stages),
    });
  }

  return (
    <form className="workflow-form" onSubmit={submit} noValidate>
      {error && (
        <Alert variant="error" title="Unable to save workflow">
          {error}
        </Alert>
      )}
      <Card title="Workflow setup">
        <div className="workflow-form__grid workflow-form__grid--identity">
          <Input
            label="Workflow name"
            value={values.name}
            onChange={(event) => {
              setValues((current) => ({ ...current, name: event.target.value }));
              clearError('name');
            }}
            {...(errors.name ? { error: errors.name } : {})}
            required
            disabled={isSubmitting}
          />
          {allowWorkflowTypeSelection && (
            <Select
              label="Workflow target"
              value={values.isDefault ? 'DEFAULT' : 'REQUEST_TYPE'}
              onChange={(event) => {
                const isDefault = event.target.value === 'DEFAULT';
                setValues((current) => ({
                  ...current,
                  isDefault,
                  workflowScope: isDefault ? 'DEPARTMENT' : current.workflowScope,
                  requestTypeId: '',
                  selectionCondition: null,
                  priority: 0,
                  stages:
                    isDefault &&
                    !current.stages.some((stage) => stage.approverType === 'DEPARTMENT_MANAGER')
                      ? [managerStage(), ...current.stages].map((stage, index) => ({
                          ...stage,
                          sequence: index + 1,
                          condition: null,
                        }))
                      : current.stages.map((stage) => ({ ...stage, condition: null })),
                }));
                setErrors({});
              }}
              options={[
                { value: 'REQUEST_TYPE', label: 'For a specific request type' },
                { value: 'DEFAULT', label: 'Organization default fallback' },
              ]}
              disabled={isSubmitting}
            />
          )}
          {!values.isDefault && (
            <Select
              label="Request routing scope"
              value={values.workflowScope}
              onChange={(event) => updateWorkflowScope(event.target.value as WorkflowScope)}
              options={[
                { value: 'DEPARTMENT', label: 'Department-level requests' },
                { value: 'ORGANIZATION', label: 'Organization-level requests' },
              ]}
              helperText="Requests without a department use organization-level workflows."
              disabled={isSubmitting}
            />
          )}
          <Select
            label="Request type"
            value={values.requestTypeId}
            placeholder={values.isDefault ? 'Organization default' : 'Select a request type'}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                requestTypeId: event.target.value,
                selectionCondition: null,
                stages: current.stages.map((stage) => ({ ...stage, condition: null })),
              }));
              clearError('requestTypeId');
            }}
            options={requestTypes.map((type) => ({
              value: type.id,
              label: `${type.name} (${type.code})`,
            }))}
            {...(errors.requestTypeId ? { error: errors.requestTypeId } : {})}
            required={!values.isDefault}
            {...(values.isDefault
              ? { helperText: 'Used only when no eligible conditional workflow matches.' }
              : {})}
            disabled={isSubmitting || values.isDefault}
          />
          {!values.isDefault && (
            <Input
              label="Workflow priority"
              type="number"
              min={0}
              max={1000}
              step={1}
              value={values.priority}
              onChange={(event) => {
                setValues((current) => ({ ...current, priority: Number(event.target.value) }));
                clearError('priority');
              }}
              {...(errors.priority ? { error: errors.priority } : {})}
              helperText="Higher-priority matching workflows are selected first."
              disabled={isSubmitting}
            />
          )}
        </div>
        {!values.isDefault && (
          <WorkflowConditionBuilder
            label="Workflow selection condition"
            description="This workflow is eligible only when the configured request fields match."
            fields={selectionFields()}
            value={values.selectionCondition}
            disabled={isSubmitting || !values.requestTypeId}
            {...(errors.selectionCondition ? { error: errors.selectionCondition } : {})}
            onChange={(selectionCondition) => {
              setValues((current) => ({ ...current, selectionCondition }));
              clearError('selectionCondition');
            }}
          />
        )}
        <Textarea
          label="Description"
          value={values.description}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
          rows={3}
          maxLength={1000}
          disabled={isSubmitting}
          helperText="Explain when this workflow should be used."
        />
      </Card>

      <Card
        title="Approval sequence"
        description={
          values.workflowScope === 'DEPARTMENT'
            ? 'Build the approval path in order. Department-level requests start with a required Department Manager review.'
            : 'Build the approval path for requests that do not belong to a department. Role approvers must be organization-scoped.'
        }
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setValues((current) => ({
                ...current,
                stages: [...current.stages, createRoleStage(current.stages.length + 1)],
              }))
            }
            disabled={isSubmitting}
          >
            Add stage
          </Button>
        }
      >
        {errors.stages && (
          <Alert variant="error" title="Review approval stages">
            {errors.stages}
          </Alert>
        )}
        <ol className="workflow-editor">
          {values.stages.map((stage, index) => (
            <li key={stage.stageId} className="workflow-editor__stage">
              <div className="workflow-editor__stage-header">
                <span className="workflow-stage-list__number">{index + 1}</span>
                <div className="workflow-editor__stage-copy">
                  <h3>Stage {index + 1}</h3>
                  <p>
                    {stage.approverType === 'DEPARTMENT_MANAGER'
                      ? 'Required first review'
                      : stage.approverType === 'ROLE'
                        ? 'Approval by a selected role'
                        : 'Approval by an organization administrator'}
                  </p>
                </div>
                <div className="workflow-editor__stage-controls">
                  <span
                    className={`workflow-editor__stage-badge ${
                      stage.isMandatory
                        ? 'workflow-editor__stage-badge--required'
                        : 'workflow-editor__stage-badge--conditional'
                    }`}
                  >
                    {stage.isMandatory ? 'Required' : 'Optional'}
                  </span>
                  {(index > 0 || values.workflowScope === 'ORGANIZATION') && (
                    <div className="workflow-editor__stage-actions">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStage(index, -1)}
                        disabled={
                          isSubmitting ||
                          (values.workflowScope === 'DEPARTMENT' ? index === 1 : index === 0)
                        }
                      >
                        Move up
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStage(index, 1)}
                        disabled={isSubmitting || index === values.stages.length - 1}
                      >
                        Move down
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setValues((current) => ({
                            ...current,
                            stages: current.stages.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        disabled={
                          isSubmitting || (values.workflowScope === 'DEPARTMENT' && index === 0)
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="workflow-form__grid workflow-form__grid--stage">
                <Input
                  label="Stage name"
                  value={stage.name}
                  onChange={(event) => updateStage(index, { name: event.target.value })}
                  disabled={isSubmitting || stage.approverType === 'DEPARTMENT_MANAGER'}
                />
                <Select
                  label="Approver"
                  value={stage.approverType}
                  onChange={(event) => {
                    const approverType = event.target.value as WorkflowApproverType;
                    const assignment: WorkflowStage['assignment'] = {
                      ...stage.assignment,
                      type: approverType,
                      resolution: approverType === 'USER' ? 'DIRECT' : 'CLAIM_ONE',
                      roleId: null,
                      userId: null,
                    };
                    delete assignment.scopeType;
                    updateStage(index, {
                      approverType,
                      isMandatory: approverType === 'DEPARTMENT_MANAGER',
                      isConfigurable: approverType !== 'DEPARTMENT_MANAGER',
                      assignment,
                    });
                  }}
                  options={
                    [
                      ...(values.workflowScope === 'DEPARTMENT' &&
                      (index === 0 || stage.approverType === 'DEPARTMENT_MANAGER')
                        ? [{ value: 'DEPARTMENT_MANAGER', label: 'Department Manager' }]
                        : []),
                      { value: 'ROLE', label: 'Role' },
                      { value: 'ORGANIZATION_ADMIN', label: 'Organization Admin' },
                    ] as { value: WorkflowApproverType; label: string }[]
                  }
                  disabled={isSubmitting || (values.workflowScope === 'DEPARTMENT' && index === 0)}
                />
                {stage.approverType === 'ROLE' && (
                  <Select
                    label="Approval role"
                    value={stage.assignment.roleId ?? ''}
                    onChange={(event) => {
                      const roleId = event.target.value || null;
                      const role = roles.find((item) => item.id === roleId);
                      const scopes = role ? getRoleSupportedScopes(role) : [];
                      const currentScope = stage.assignment.scopeType;
                      const scopeType =
                        values.workflowScope === 'ORGANIZATION' && scopes.includes('ORGANIZATION')
                          ? 'ORGANIZATION'
                          : scopes.length === 1
                            ? scopes[0]
                            : scopes.includes(currentScope as 'ORGANIZATION' | 'DEPARTMENT')
                              ? currentScope
                              : undefined;
                      const assignment: WorkflowStage['assignment'] = {
                        ...stage.assignment,
                        roleId,
                      };
                      if (scopeType) assignment.scopeType = scopeType;
                      else delete assignment.scopeType;
                      updateStage(index, {
                        assignment,
                      });
                    }}
                    options={[
                      {
                        value: '',
                        label: roles.length ? 'Select an active role' : 'No active roles available',
                      },
                      ...roles.map((role) => ({ value: role.id, label: role.name })),
                    ]}
                    {...(stage.assignment.roleId ? {} : { error: 'A role is required.' })}
                    disabled={isSubmitting}
                  />
                )}
                {stage.approverType === 'ROLE' &&
                  (() => {
                    const role = roles.find((item) => item.id === stage.assignment.roleId);
                    const scopes = role
                      ? getRoleSupportedScopes(role).filter(
                          (scope) =>
                            values.workflowScope !== 'ORGANIZATION' || scope === 'ORGANIZATION',
                        )
                      : [];
                    if (scopes.length > 1) {
                      return (
                        <Select
                          label="Approver eligibility"
                          value={stage.assignment.scopeType ?? ''}
                          placeholder="Choose an exact scope"
                          onChange={(event) =>
                            updateStage(index, {
                              assignment: {
                                ...stage.assignment,
                                scopeType: event.target.value as 'ORGANIZATION' | 'DEPARTMENT',
                              },
                            })
                          }
                          options={scopes.map((scope) => ({
                            value: scope,
                            label:
                              scope === 'ORGANIZATION'
                                ? 'Organization-wide role holders'
                                : 'Members of the request department',
                          }))}
                          helperText="Choose exactly which assignments can approve this stage."
                          disabled={isSubmitting}
                        />
                      );
                    }
                    if (scopes.length === 1) {
                      return (
                        <p className="workflow-form__scope-note">
                          Approver eligibility:{' '}
                          {scopes[0] === 'ORGANIZATION'
                            ? 'Organization-wide role holders'
                            : 'Members of the request department'}
                        </p>
                      );
                    }
                    return role ? (
                      <Alert variant="warning" title="Role scope configuration required">
                        Configure supported scopes for {role.name} before using it as a workflow
                        approver.
                      </Alert>
                    ) : (
                      <p className="workflow-form__scope-note">
                        Select a role to view its supported scopes.
                      </p>
                    );
                  })()}
              </div>
              {stage.approverType !== 'DEPARTMENT_MANAGER' && (
                <WorkflowConditionBuilder
                  label="Stage execution condition"
                  description="Leave empty to always run this stage, or define the request details that must match."
                  fields={requestFields()}
                  value={stage.condition}
                  disabled={isSubmitting}
                  onChange={(condition) => updateStage(index, { condition })}
                />
              )}
              <div className="workflow-form__condition-preview">
                <strong>When it runs</strong>
                <span>
                  {stage.approverType === 'DEPARTMENT_MANAGER'
                    ? 'This required review runs for every request.'
                    : stage.condition
                      ? `When ${formatWorkflowCondition(stage.condition, requestFields())}.`
                      : 'For every request that reaches this stage.'}
                </span>
              </div>
              <div className="workflow-form__grid workflow-form__grid--stage">
                <Select
                  label="Stage SLA"
                  value={stage.sla ? 'enabled' : 'disabled'}
                  onChange={(event) =>
                    updateStage(index, {
                      sla:
                        event.target.value === 'enabled'
                          ? (stage.sla ?? { duration: 1, unit: 'DAYS' })
                          : null,
                    })
                  }
                  options={[
                    { value: 'disabled', label: 'No SLA' },
                    { value: 'enabled', label: 'Enable SLA' },
                  ]}
                  disabled={isSubmitting}
                />
                {stage.sla && (
                  <>
                    <Input
                      label="Duration"
                      type="number"
                      min={1}
                      step={1}
                      value={stage.sla.duration}
                      onChange={(event) =>
                        updateStage(index, {
                          sla: { ...stage.sla!, duration: Number(event.target.value) },
                        })
                      }
                      {...(!Number.isInteger(stage.sla.duration) || stage.sla.duration < 1
                        ? { error: 'Enter a positive whole number.' }
                        : {})}
                      disabled={isSubmitting}
                    />
                    <Select
                      label="Unit"
                      value={stage.sla.unit}
                      onChange={(event) =>
                        updateStage(index, {
                          sla: { ...stage.sla!, unit: event.target.value as WorkflowSlaUnit },
                        })
                      }
                      options={SLA_UNITS}
                      disabled={isSubmitting}
                    />
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="workflow-form__actions">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          Save workflow
        </Button>
      </div>
    </form>
  );
}
