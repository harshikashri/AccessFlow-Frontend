import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { WorkflowForm } from './WorkflowForm';
import { formatWorkflowCondition, serializeWorkflowStages } from './workflow-form.utils';
import type { RequestType } from '@/features/requests/types/request.types';
import type { ManagedRole } from '@/features/roles/types/role.types';
import type { WorkflowCondition, WorkflowStage } from '../types/workflow.types';

const requestType: RequestType = {
  id: 'request-type-1',
  organizationId: 'organization-1',
  definitionType: 'REQUEST_TYPE',
  name: 'Purchase Request',
  code: 'PURCHASE',
  description: '',
  fields: [
    {
      key: 'estimatedCost',
      label: 'Estimated cost',
      description: '',
      type: 'NUMBER',
      semantic: 'AMOUNT',
      required: true,
      placeholder: '',
      displayOrder: 0,
    },
    {
      key: 'kind',
      label: 'Purchase type',
      description: '',
      type: 'SELECT',
      semantic: null,
      required: false,
      placeholder: '',
      options: ['Hardware', 'Software'],
      displayOrder: 1,
    },
  ],
  isActive: true,
  createdAt: '2026-11-15T10:00:00.000Z',
  updatedAt: '2026-11-15T10:00:00.000Z',
};

describe('serializeWorkflowStages', () => {
  it('preserves configured conditions in the update payload', () => {
    const stage = {
      stageId: 'finance',
      sequence: 2,
      name: 'Finance approval',
      description: '',
      approverType: 'ROLE',
      assignment: {
        type: 'ROLE',
        resolution: 'CLAIM_ONE',
        roleId: 'role-1',
        userId: null,
      },
      approvalMode: 'ANY',
      isMandatory: false,
      isConfigurable: true,
      roleId: 'role-1',
      condition: { field: 'amount', operator: 'GREATER_THAN', value: 50000 },
      sla: null,
    } satisfies WorkflowStage;

    expect(serializeWorkflowStages([stage])[0]?.condition).toEqual(stage.condition);
  });

  it('preserves nested conditions when saving a workflow', () => {
    const condition: WorkflowCondition = {
      operator: 'OR',
      conditions: [
        { field: 'estimatedCost', operator: 'GREATER_THAN', value: 75000 },
        { field: 'kind', operator: 'IN', value: ['Hardware', 'Software'] },
      ],
    };
    const stage = {
      stageId: 'finance',
      sequence: 2,
      name: 'Finance approval',
      description: '',
      approverType: 'ROLE',
      assignment: {
        type: 'ROLE',
        resolution: 'CLAIM_ONE',
        roleId: 'role-1',
        userId: null,
      },
      approvalMode: 'ANY',
      isMandatory: true,
      isConfigurable: true,
      roleId: 'role-1',
      condition,
      sla: null,
    } satisfies WorkflowStage;

    expect(serializeWorkflowStages([stage])[0]?.condition).toEqual(condition);
  });

  it('formats configured amount conditions in readable language', () => {
    expect(
      formatWorkflowCondition(
        { field: 'estimatedCost', operator: 'GREATER_THAN', value: 75000 },
        requestType.fields,
      ),
    ).toBe('Estimated cost is greater than ₹75,000');
  });
});

describe('WorkflowForm', () => {
  it('requires an exact supported scope when a workflow role supports both', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const role: ManagedRole = {
      id: 'role-1',
      organizationId: 'organization-1',
      name: 'Dual Scope Approver',
      description: '',
      roleType: 'CUSTOM',
      rolePurpose: 'FINANCE_APPROVER',
      assignmentScopes: ['ORGANIZATION', 'DEPARTMENT'],
      permissions: ['requests.approve'],
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
      createdBy: null,
      assignmentCount: 0,
    };
    render(
      createElement(WorkflowForm, {
        requestTypes: [requestType],
        roles: [role],
        isSubmitting: false,
        error: null,
        onCancel: vi.fn(),
        onSubmit,
      }),
    );

    await user.type(screen.getByLabelText(/Workflow name/), 'Department budget approvals');
    await user.selectOptions(screen.getByLabelText(/Request type/), requestType.id);
    await user.click(screen.getByRole('button', { name: 'Add stage' }));
    await user.selectOptions(screen.getAllByLabelText('Approver')[1]!, 'ROLE');
    await user.selectOptions(screen.getByLabelText('Approval role'), role.id);
    expect((screen.getByLabelText('Approver eligibility') as HTMLSelectElement).value).toBe('');
    await user.selectOptions(screen.getByLabelText('Approver eligibility'), 'ORGANIZATION');
    await user.click(screen.getByRole('button', { name: 'Save workflow' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        stages: expect.arrayContaining([
          expect.objectContaining({
            approverType: 'ROLE',
            assignment: expect.objectContaining({
              roleId: role.id,
              scopeType: 'ORGANIZATION',
            }),
          }),
        ]),
      }),
    );
  });

  it('submits the configured request selection condition', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      createElement(WorkflowForm, {
        requestTypes: [requestType],
        roles: [],
        isSubmitting: false,
        error: null,
        allowDefaultWorkflow: true,
        allowWorkflowTypeSelection: true,
        onCancel: vi.fn(),
        onSubmit,
      }),
    );

    await user.type(screen.getByLabelText(/Workflow name/), 'High-value purchases');
    await user.selectOptions(screen.getByLabelText(/Request type/), 'request-type-1');
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    await user.selectOptions(screen.getByLabelText('Comparison'), 'GREATER_THAN');
    await user.clear(screen.getByLabelText('Value'));
    await user.type(screen.getByLabelText('Value'), '75000');
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    await user.selectOptions(screen.getAllByLabelText('Request field')[1]!, 'kind');
    await user.selectOptions(screen.getAllByLabelText('Comparison')[1]!, 'IN');
    await user.selectOptions(screen.getByLabelText('Values'), 'Hardware');
    await user.click(screen.getByRole('button', { name: 'Save workflow' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        requestTypeId: 'request-type-1',
        isDefault: false,
        selectionCondition: {
          operator: 'AND',
          conditions: [
            { field: 'estimatedCost', operator: 'GREATER_THAN', value: 75000 },
            { field: 'kind', operator: 'IN', value: ['Hardware'] },
          ],
        },
      }),
    );
  });
});
