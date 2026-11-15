import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkImportDialog } from '@/features/users/components/BulkImportDialog';

const bulkUserServiceMock = vi.hoisted(() => ({
  downloadTemplate: vi.fn(),
  validateImport: vi.fn(),
  confirmImport: vi.fn(),
  downloadFailedReport: vi.fn(),
  deactivateUsers: vi.fn(),
}));

vi.mock('@/features/users/services/bulk-user.service', () => ({
  bulkUserService: bulkUserServiceMock,
}));

const preview = {
  limits: { maxBytes: 524288, maxRows: 500 },
  summary: {
    totalRows: 3,
    validUsers: 1,
    existingUsers: 0,
    invalidUsers: 1,
    validAssignments: 1,
    invalidRows: 1,
    duplicateRows: 1,
  },
  rows: [
    {
      rowNumber: 2,
      firstName: 'Taylor',
      lastName: 'User',
      email: 'taylor@example.com',
      department: 'Engineering',
      role: 'Reviewer',
      scopeType: 'DEPARTMENT',
      status: 'VALID',
      errors: [],
    },
    {
      rowNumber: 3,
      firstName: 'Morgan',
      lastName: 'User',
      email: 'morgan@example.com',
      department: null,
      role: 'Unknown role',
      scopeType: null,
      status: 'INVALID',
      errors: ['Choose an assignable role.'],
    },
    {
      rowNumber: 4,
      firstName: 'Taylor',
      lastName: 'User',
      email: 'taylor@example.com',
      department: 'Engineering',
      role: 'Reviewer',
      scopeType: 'DEPARTMENT',
      status: 'DUPLICATE',
      errors: ['This row duplicates another user.'],
    },
  ],
};

const result = {
  importId: 'import-1',
  summary: {
    totalRows: 3,
    usersCreated: 1,
    assignmentsCreated: 1,
    failedAssignments: 1,
    existingUsersSkipped: 0,
    invalidUsersSkipped: 1,
    failedUsers: 0,
    invitations: { sent: 1, failed: 0 },
  },
  rows: [
    { ...preview.rows[0], status: 'IMPORTED' },
    { ...preview.rows[1], status: 'INVALID' },
    { ...preview.rows[2], status: 'DUPLICATE' },
  ],
  errorReport: {
    filename: 'bulk-import-errors.csv',
    contentType: 'text/csv',
    csv: 'rowNumber,email,error\r\n3,morgan@example.com,Unknown role',
  },
};

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BulkImportDialog open actorId="admin-1" organizationId="org-1" onOpenChange={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  bulkUserServiceMock.downloadTemplate.mockReset();
  bulkUserServiceMock.validateImport.mockReset();
  bulkUserServiceMock.confirmImport.mockReset();
  bulkUserServiceMock.downloadFailedReport.mockReset();
  bulkUserServiceMock.deactivateUsers.mockReset();
});

describe('BulkImportDialog', () => {
  it('validates, filters, confirms, and displays individual import results', async () => {
    const user = userEvent.setup();
    bulkUserServiceMock.validateImport.mockResolvedValue(preview);
    bulkUserServiceMock.confirmImport.mockResolvedValue(result);
    renderDialog();

    const file = new File(['name,email'], 'users.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('Choose CSV file'), file);
    expect(screen.getByText(/users\.csv/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Validate file' }));
    expect(await screen.findByRole('heading', { name: 'Review validation results' })).toBeTruthy();
    expect(screen.getByText('Choose an assignable role.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Invalid' }));
    expect(screen.getByText('Morgan User')).toBeTruthy();
    expect(screen.queryByText('Taylor User')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Review and confirm' }));
    expect(screen.getByRole('heading', { name: 'Confirm import' })).toBeTruthy();
    expect(screen.getByText('New users to create')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Back to preview' }));
    expect(screen.getByText('Morgan User')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Review and confirm' }));
    await user.click(screen.getByRole('button', { name: 'Import valid users' }));

    expect(await screen.findByRole('heading', { name: 'Import complete' })).toBeTruthy();
    expect(screen.getByText('Users created')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download failed rows CSV' })).toBeTruthy();
    expect(bulkUserServiceMock.validateImport).toHaveBeenCalledWith(file);
    expect(bulkUserServiceMock.confirmImport).toHaveBeenCalledWith(file);
  });

  it('rejects a non-CSV selection and prevents validation', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderDialog();
    await user.upload(
      screen.getByLabelText('Choose CSV file'),
      new File(['not a csv'], 'users.txt', { type: 'text/plain' }),
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain(
      'Choose a CSV file with a .csv filename extension.',
    );
    expect(screen.getByRole('button', { name: 'Validate file' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(bulkUserServiceMock.validateImport).not.toHaveBeenCalled();
  });

  it('enforces the backend-aligned 512 KiB upload limit', async () => {
    const user = userEvent.setup();
    renderDialog();
    const oversizedCsv = new File([new Uint8Array(524289)], 'users.csv', { type: 'text/csv' });

    await user.upload(screen.getByLabelText('Choose CSV file'), oversizedCsv);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain(
      'The selected file is larger than the 512 KiB limit.',
    );
    expect(bulkUserServiceMock.validateImport).not.toHaveBeenCalled();
  });

  it('shows duplicate and failed-assignment counts and separate report downloads', async () => {
    const user = userEvent.setup();
    const createdBlobs: Blob[] = [];
    const createObjectUrl = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return 'blob:failed-rows';
    });
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    });
    const clickAnchor = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    bulkUserServiceMock.validateImport.mockResolvedValue(preview);
    bulkUserServiceMock.confirmImport.mockResolvedValue(result);
    renderDialog();

    await user.upload(
      screen.getByLabelText('Choose CSV file'),
      new File(['name,email'], 'users.csv', { type: 'text/csv' }),
    );
    await user.click(screen.getByRole('button', { name: 'Validate file' }));
    expect(await screen.findByText('Duplicate rows')).toBeTruthy();
    expect(screen.getByText('This row duplicates another user.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Review and confirm' }));
    expect(screen.getByText('Duplicate rows to skip')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Import valid users' }));

    expect(await screen.findByText('Failed role assignments')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download failed rows CSV' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download detailed error report' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Download failed rows CSV' }));
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(createdBlobs[0]?.type).toBe('text/csv');
    await expect(createdBlobs[0]?.text()).resolves.toBe(result.errorReport.csv);
    expect(bulkUserServiceMock.downloadFailedReport).not.toHaveBeenCalled();
    clickAnchor.mockRestore();
    vi.unstubAllGlobals();
  });

  it('hides the failed-rows download when there are no failed rows', async () => {
    const user = userEvent.setup();
    bulkUserServiceMock.validateImport.mockResolvedValue({
      ...preview,
      summary: { ...preview.summary, invalidUsers: 0, invalidRows: 0, duplicateRows: 0 },
      rows: [{ ...preview.rows[0], status: 'VALID' }],
    });
    bulkUserServiceMock.confirmImport.mockResolvedValue({
      ...result,
      summary: {
        ...result.summary,
        invalidUsersSkipped: 0,
        failedUsers: 0,
        failedAssignments: 0,
        invitations: { sent: 1, failed: 0 },
      },
      rows: [{ ...preview.rows[0], status: 'IMPORTED', errors: [] }],
      errorReport: {
        ...result.errorReport,
        csv: 'rowNumber,email,error\r\n',
      },
    });
    renderDialog();

    await user.upload(
      screen.getByLabelText('Choose CSV file'),
      new File(['name,email'], 'users.csv', { type: 'text/csv' }),
    );
    await user.click(screen.getByRole('button', { name: 'Validate file' }));
    await user.click(await screen.findByRole('button', { name: 'Review and confirm' }));
    await user.click(screen.getByRole('button', { name: 'Import valid users' }));

    expect(await screen.findByRole('heading', { name: 'Import complete' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Download failed rows CSV' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Download detailed error report' })).toBeTruthy();
  });
});
