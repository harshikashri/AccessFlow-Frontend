import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { RequestSummary } from '../types/request.types';
import { RequestTable } from './RequestTable';

const request: RequestSummary = {
  id: 'request-1',
  organizationId: 'organization-1',
  requestNumber: 'REQ-26-123456',
  requesterId: 'user-1',
  departmentId: null,
  requestTypeId: 'type-1',
  requestType: 'PURCHASE',
  requestTypeCode: 'PURCHASE',
  requestTypeName: 'Purchase Request',
  title: 'Test request',
  description: '',
  priority: 'MEDIUM',
  amount: null,
  details: {},
  attachments: [],
  status: 'DRAFT',
  workflowDefinitionId: null,
  currentSequence: 0,
  submittedAt: null,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  returnedAt: null,
  returnedBy: null,
  returnReason: null,
  createdAt: '2026-11-18T00:00:00.000Z',
  updatedAt: '2026-11-18T00:00:00.000Z',
};

describe('RequestTable', () => {
  it('renders column headings as table headers in a header row', () => {
    render(
      <MemoryRouter>
        <RequestTable
          items={[request]}
          isLoading={false}
          hasFilters={false}
          onClearFilters={() => undefined}
        />
      </MemoryRouter>,
    );

    const requestHeading = screen.getByRole('columnheader', { name: 'Request' });
    expect(requestHeading.closest('thead')).not.toBeNull();
    expect(requestHeading.closest('tr')?.querySelectorAll('th')).toHaveLength(6);
  });
});
