import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkflowStageList } from '@/features/workflows/components/WorkflowStageList';
import type { WorkflowStage } from '@/features/workflows/types/workflow.types';

const stages: WorkflowStage[] = [
  {
    stageId: 'stage-role',
    sequence: 2,
    name: 'Manager approval',
    description: '',
    approverType: 'ROLE',
    assignment: {
      type: 'ROLE',
      resolution: 'CLAIM_ONE',
      scopeType: 'ORGANIZATION',
      roleId: 'role-1',
      userId: null,
    },
    approvalMode: 'ANY',
    isMandatory: true,
    isConfigurable: true,
    roleId: 'role-1',
    condition: null,
    sla: null,
  },
  {
    stageId: 'stage-user',
    sequence: 1,
    name: 'Direct approval',
    description: '',
    approverType: 'USER',
    assignment: {
      type: 'USER',
      resolution: 'DIRECT',
      scopeType: 'ORGANIZATION',
      roleId: null,
      userId: 'user-1',
    },
    approvalMode: 'ANY',
    isMandatory: true,
    isConfigurable: true,
    roleId: null,
    condition: null,
    sla: null,
  },
];

describe('WorkflowStageList', () => {
  it('shows approval role names and hides the default Claim one resolution', () => {
    render(<WorkflowStageList stages={stages} roleNames={{ 'role-1': 'Finance Approver' }} />);

    expect(
      screen.getByText('Finance Approver', { selector: '.workflow-stage-card__type' }),
    ).toBeTruthy();
    expect(screen.queryByText('role-1')).toBeNull();
    expect(screen.queryByText('Approval role')).toBeNull();
    expect(screen.queryByText('CLAIM ONE')).toBeNull();
    expect(screen.getByText('DIRECT')).toBeTruthy();
  });
});
