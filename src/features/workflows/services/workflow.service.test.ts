import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workflowService } from './workflow.service';
import type { Workflow, WorkflowInput } from '../types/workflow.types';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/services/api/api-client', () => ({ apiClient: apiClientMock }));

const workflow: Workflow = {
  id: 'workflow-1',
  organizationId: 'organization-1',
  definitionType: 'APPROVAL_WORKFLOW',
  name: 'Purchase approvals',
  description: 'Approval sequence',
  requestTypeId: 'request-type-1',
  workflowScope: 'DEPARTMENT',
  selectionCondition: null,
  priority: 0,
  version: 1,
  isDefault: false,
  isActive: true,
  stages: [
    {
      stageId: 'manager',
      sequence: 1,
      name: 'Department Manager Approval',
      description: '',
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
      condition: {
        field: 'amount',
        operator: 'GREATER_THAN',
        value: 50000,
      },
      sla: null,
    },
  ],
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-11-15T10:00:00.000Z',
  updatedAt: '2026-11-15T10:00:00.000Z',
};

beforeEach(() => {
  apiClientMock.get.mockReset();
  apiClientMock.post.mockReset();
  apiClientMock.patch.mockReset();
});

describe('workflow service API contracts', () => {
  it('lists workflows using the approval workflow endpoint and filters', async () => {
    apiClientMock.get.mockResolvedValue({
      data: {
        success: true,
        data: { items: [workflow], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
      },
    });

    await expect(
      workflowService.list({
        page: 1,
        limit: 10,
        search: 'purchase',
        isActive: true,
        requestTypeId: 'request-type-1',
      }),
    ).resolves.toEqual({
      items: [workflow],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    expect(apiClientMock.get).toHaveBeenCalledWith('/approval-workflows', {
      params: {
        page: '1',
        limit: '10',
        search: 'purchase',
        isActive: 'true',
        requestTypeId: 'request-type-1',
      },
    });
  });

  it('uses versioned update and lifecycle endpoints', async () => {
    apiClientMock.patch
      .mockResolvedValueOnce({ data: { success: true, data: workflow } })
      .mockResolvedValueOnce({ data: { success: true, data: workflow } });
    const input: WorkflowInput = {
      name: workflow.name,
      description: workflow.description,
      requestTypeId: workflow.requestTypeId,
      workflowScope: workflow.workflowScope,
      isDefault: false,
      selectionCondition: null,
      priority: 0,
      stages: workflow.stages,
    };

    await expect(workflowService.update(workflow.id, input)).resolves.toEqual(workflow);
    await expect(workflowService.setStatus(workflow.id, false)).resolves.toEqual(workflow);
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(1, '/approval-workflows/workflow-1', input);
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(
      2,
      '/approval-workflows/workflow-1/deactivate',
    );
  });
});
