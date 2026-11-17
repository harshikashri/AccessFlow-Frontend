import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestDetailsPage } from '@/features/requests/pages/RequestDetailsPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRequestDetails: vi.fn(),
  useRequestProgress: vi.fn(),
  useRequestHistory: vi.fn(),
  useSubmitRequest: vi.fn(),
  useResubmitRequest: vi.fn(),
  useCancelRequest: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock('@/features/auth/context/useAuth', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('@/features/requests/hooks/useRequests', () => ({
  useRequestDetails: mocks.useRequestDetails,
  useRequestProgress: mocks.useRequestProgress,
  useRequestHistory: mocks.useRequestHistory,
  useSubmitRequest: mocks.useSubmitRequest,
  useResubmitRequest: mocks.useResubmitRequest,
  useCancelRequest: mocks.useCancelRequest,
}));

const actor = {
  id: '64b000000000000000000001',
  name: 'Department Manager',
  email: 'manager@example.com',
  platformRole: null,
  organizationId: '64b000000000000000000002',
  authorization: {
    platformPermissions: [],
    organizationPermissions: [],
    departmentPermissions: {
      '64b000000000000000000003': ['requests.view'],
    },
  },
};

const requestSummary = {
  id: '64b000000000000000000004',
  organizationId: actor.organizationId,
  requestNumber: 'REQ-2026-001',
  requesterId: '64b000000000000000000005',
  departmentId: '64b000000000000000000003',
  requestTypeId: '64b000000000000000000006',
  requestType: 'PURCHASE',
  requestTypeCode: 'PURCHASE',
  requestTypeName: 'Purchase Request',
  title: 'Laptop request',
  description: 'A new laptop is required.',
  priority: 'MEDIUM',
  amount: 1200,
  details: { reason: 'Replacement' },
  attachments: [],
  status: 'PENDING_APPROVAL',
  workflowDefinitionId: '64b000000000000000000007',
  currentSequence: 1,
  submittedAt: '2026-11-18T00:00:00.000Z',
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  returnedAt: null,
  returnedBy: null,
  returnReason: null,
  createdAt: '2026-11-17T00:00:00.000Z',
  updatedAt: '2026-11-18T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/requests/request-1']}>
      <Routes>
        <Route path="/requests/:requestId" element={<RequestDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ user: actor, authorizationStatus: 'available' });
  mocks.useRequestDetails.mockReturnValue({ data: requestSummary, isError: false });
  mocks.useRequestProgress.mockReturnValue({
    data: {
      request: requestSummary,
      attemptNumber: 1,
      currentStage: {
        sequence: 1,
        stageId: 'manager-review',
        stageName: 'Manager Review',
        status: 'ACTIVE',
      },
      stages: [
        {
          sequence: 1,
          stageId: 'manager-review',
          stageName: 'Manager Review',
          description: 'Confirm the department request is appropriate.',
          status: 'ACTIVE',
          approverType: 'DEPARTMENT_MANAGER',
          approverRoleName: null,
          approverNames: ['Department Manager'],
          approvalMode: 'ANY',
          scopeType: 'DEPARTMENT',
          slaDueAt: null,
          comments: [],
        },
      ],
      totalApplicableStages: 1,
      completedStages: [],
      pendingStages: [1],
      skippedStages: [],
      submittedAt: '2026-11-18T00:00:00.000Z',
      updatedAt: '2026-11-18T00:00:00.000Z',
    },
    isError: false,
  });
  mocks.useRequestHistory.mockReturnValue({
    data: {
      request: requestSummary,
      timeline: Array.from({ length: 7 }, (_, index) => ({
        type: `HISTORY_EVENT_${index + 1}`,
        actorId: actor.id,
        actorName: actor.name,
        timestamp: `2026-11-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        metadata: {},
      })),
    },
    isError: false,
  });
  mocks.useSubmitRequest.mockReturnValue({ mutateAsync: mocks.mutateAsync, isPending: false });
  mocks.useResubmitRequest.mockReturnValue({ mutateAsync: mocks.mutateAsync, isPending: false });
  mocks.useCancelRequest.mockReturnValue({ mutateAsync: mocks.mutateAsync, isPending: false });
});

describe('RequestDetailsPage tracking panels', () => {
  it('expands approval stage details and keeps older activity collapsed until requested', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText('Manager Review'));
    expect(screen.getByText('Confirm the department request is appropriate.')).toBeTruthy();
    expect(screen.getByText('Department Manager', { selector: 'dd' })).toBeTruthy();
    expect(screen.getByText('Approval rule')).toBeTruthy();

    expect(screen.getByText('History Event 7')).toBeTruthy();
    expect(screen.queryByText('History Event 1')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Show all activity (7)' }));
    expect(screen.getByText('History Event 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show recent activity' })).toBeTruthy();
  });
});
