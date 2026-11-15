import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportPreviewTable } from '@/features/users/components/ImportPreviewTable';
import type { BulkImportPreviewRow } from '@/features/users/types/bulk-user.types';

const rows: BulkImportPreviewRow[] = [
  {
    rowNumber: 2,
    firstName: 'Taylor',
    lastName: 'User',
    email: 'taylor@example.com',
    department: null,
    role: 'Reviewer',
    scopeType: null,
    status: 'IMPORTED',
    errors: [],
  },
  {
    rowNumber: 3,
    firstName: 'Morgan',
    lastName: 'User',
    email: 'morgan@example.com',
    department: null,
    role: 'Reviewer',
    scopeType: null,
    status: 'INVITATION_FAILED',
    errors: ['Invitation email could not be sent.'],
  },
];

describe('ImportPreviewTable', () => {
  it('includes invitation failures in the invalid filter', () => {
    render(<ImportPreviewTable rows={rows} filter="INVALID" onFilterChange={vi.fn()} />);

    expect(screen.getByText('Invitation failed')).toBeTruthy();
    expect(screen.getByText('Invitation email could not be sent.')).toBeTruthy();
    expect(screen.queryByText('Taylor User')).toBeNull();
  });
});
