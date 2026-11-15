import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalDetailsPage } from '@/features/approvals/pages/ApprovalDetailsPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  hasPermission: vi.fn(),
  useApprovalDetails: vi.fn(),
  useClaimApproval: vi.fn(),
  useApproveApproval: vi.fn(),
  useRejectApproval: vi.fn(),
  useReturnApproval: vi.fn(),
}));

vi.mock('@/features/auth/context/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/features/authorization/permissions', () => ({ hasPermission: mocks.hasPermission }));
vi.mock('@/features/approvals/hooks/useApprovals', () => ({
  useApprovalDetails: mocks.useApprovalDetails,
  useClaimApproval: mocks.useClaimApproval,
  useApproveApproval: mocks.useApproveApproval,
  useRejectApproval: mocks.useRejectApproval,
  useReturnApproval: mocks.useReturnApproval,
}));

const approval = {
  id: '64b000000000000000000060',
  organizationId: '64b000000000000000000020',
  requestId: '64b000000000000000000061',
  attemptNumber: 1,
  workflowDefinitionId: '64b000000000000000000062',
  workflowVersion: 2,
  stageId: 'finance-approval',
  stageName: 'Finance Approval',
  approverType: 'ROLE' as const,
  approverRoleName: 'Finance Approver',
  sequence: 2,
  status: 'ACTIVE' as const,
  approverId: '64b000000000000000000030',
  claimedBy: null,
  claimedAt: null,
  claimExpiresAt: null,
  assignmentResolution: 'CLAIM_ONE' as const,
  approvalMode: 'ANY' as const,
  decidedBy: null,
  decisionAt: null,
  comments: '',
  returnedBy: null,
  returnedAt: null,
  slaDueAt: null,
};

const details = {
  approval,
  request: {
    _id: approval.requestId,
    title: 'Purchase Request',
    description: 'Purchase equipment',
    requestNumber: 'REQ-TEST-1',
    status: 'PENDING_APPROVAL',
    requesterId: { name: 'Employee One' },
    departmentId: { name: 'Finance' },
    details: { estimatedCost: 96000 },
    submittedAt: null,
  },
  workflow: null,
  history: [],
};

describe('ApprovalDetailsPage', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({
      user: {
        id: approval.approverId,
        organizationId: approval.organizationId,
        platformRole: null,
        name: 'Finance Approver',
        email: 'finance@example.com',
        authorization: {
          platformPermissions: [],
          organizationPermissions: [],
          departmentPermissions: {},
        },
      },
      authorizationStatus: 'available',
    });
    mocks.hasPermission.mockReturnValue(true);
    mocks.useApprovalDetails.mockReturnValue({
      data: details,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useClaimApproval.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mocks.useApproveApproval.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mocks.useRejectApproval.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mocks.useReturnApproval.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('shows the configured approver group and reports claim failures', async () => {
    const user = userEvent.setup();
    const claim = vi
      .fn()
      .mockRejectedValue(new Error('This approval is claimed by another approver.'));
    const refetch = vi.fn();
    mocks.useClaimApproval.mockReturnValue({ mutateAsync: claim, isPending: false });
    mocks.useApprovalDetails.mockReturnValue({ data: details, isError: false, refetch });

    render(
      <MemoryRouter initialEntries={['/approvals/step-id']}>
        <Routes>
          <Route path="/approvals/:approvalStepId" element={<ApprovalDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Finance Approver')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Claim approval' }));

    expect(await screen.findByText('This approval is claimed by another approver.')).toBeTruthy();
    expect(claim).toHaveBeenCalledWith(approval.id);
    expect(refetch).toHaveBeenCalled();
  });
});
