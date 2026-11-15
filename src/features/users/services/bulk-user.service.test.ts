import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bulkUserService } from '@/features/users/services/bulk-user.service';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/services/api/api-client', () => ({
  apiClient: apiClientMock,
}));

function response(data: unknown) {
  return { data: { success: true, data } };
}

const row = {
  rowNumber: 2,
  firstName: 'Taylor',
  lastName: 'User',
  email: 'taylor@example.com',
  department: 'Engineering',
  role: 'Reviewer',
  scopeType: 'DEPARTMENT',
  status: 'VALID',
  errors: [],
};

const preview = {
  limits: { maxBytes: 524288, maxRows: 500 },
  summary: {
    totalRows: 1,
    validUsers: 1,
    existingUsers: 0,
    invalidUsers: 0,
    validAssignments: 1,
    invalidRows: 0,
    duplicateRows: 0,
  },
  rows: [row],
};

const importResult = {
  importId: 'import-1',
  summary: {
    totalRows: 1,
    usersCreated: 1,
    assignmentsCreated: 1,
    failedAssignments: 0,
    existingUsersSkipped: 0,
    invalidUsersSkipped: 0,
    failedUsers: 0,
    invitations: { sent: 1, failed: 0 },
  },
  rows: [{ ...row, status: 'CREATED' }],
  errorReport: {
    filename: 'bulk-import-errors.csv',
    contentType: 'text/csv',
    csv: 'rowNumber,email,error\r\n',
  },
};

beforeEach(() => {
  apiClientMock.get.mockReset();
  apiClientMock.post.mockReset();
});

describe('bulkUserService', () => {
  it('downloads the CSV template as a blob', async () => {
    const blob = new Blob(['firstName,lastName,email']);
    apiClientMock.get.mockResolvedValue({ data: blob });

    await expect(bulkUserService.downloadTemplate()).resolves.toBe(blob);
    expect(apiClientMock.get).toHaveBeenCalledWith('/users/bulk-import/template', {
      responseType: 'blob',
    });
  });

  it('uploads multipart files for validation and import confirmation', async () => {
    const file = new File(['firstName,lastName,email'], 'users.csv', { type: 'text/csv' });
    apiClientMock.post
      .mockResolvedValueOnce(response(preview))
      .mockResolvedValueOnce(response(importResult));

    await expect(bulkUserService.validateImport(file)).resolves.toEqual(preview);
    await expect(bulkUserService.confirmImport(file)).resolves.toEqual(importResult);

    for (const [callIndex, path] of [
      [0, '/users/bulk-import/validate'],
      [1, '/users/bulk-import/confirm'],
    ] as const) {
      const [calledPath, formData] = apiClientMock.post.mock.calls[callIndex] as [string, FormData];
      expect(calledPath).toBe(path);
      expect(formData.get('file')).toBe(file);
    }
  });

  it('downloads the CSV error report using the original input file', async () => {
    const file = new File(['data'], 'users.csv', { type: 'text/csv' });
    const blob = new Blob(['rowNumber,email,error'], { type: 'text/csv' });
    apiClientMock.post.mockResolvedValue({ data: blob });

    await expect(bulkUserService.downloadFailedReport(file)).resolves.toBe(blob);
    const [path, formData, config] = apiClientMock.post.mock.calls[0] as [
      string,
      FormData,
      { responseType: string },
    ];
    expect(path).toBe('/users/bulk-import/failed-report');
    expect(formData.get('file')).toBe(file);
    expect(config).toEqual({ responseType: 'blob' });
  });

  it('deduplicates request IDs and preserves status-based individual results', async () => {
    const data = {
      summary: { requested: 3, deactivated: 1, failed: 1 },
      results: [
        { userId: 'user-1', status: 'DEACTIVATED', message: 'Membership deactivated.' },
        { userId: 'user-3', status: 'ALREADY_INACTIVE', message: 'Already inactive.' },
        {
          userId: 'user-2',
          status: 'FAILED',
          message: 'A pending approval blocks this action.',
          code: 'PENDING_APPROVAL',
        },
      ],
    };
    apiClientMock.post.mockResolvedValue(response(data));

    await expect(
      bulkUserService.deactivateUsers(['user-1', 'user-1', 'user-2', 'user-3']),
    ).resolves.toEqual(data);
    expect(apiClientMock.post).toHaveBeenCalledWith('/users/bulk-deactivate', {
      userIds: ['user-1', 'user-2', 'user-3'],
    });
  });

  it('rejects incomplete per-user deactivation results', async () => {
    apiClientMock.post.mockResolvedValue(
      response({
        summary: { requested: 2, deactivated: 1, failed: 1 },
        results: [{ userId: 'user-1', status: 'DEACTIVATED', message: 'Done.' }],
      }),
    );

    await expect(bulkUserService.deactivateUsers(['user-1', 'user-2'])).rejects.toThrow(
      'The bulk user API returned an incomplete deactivation result.',
    );
  });

  it('updates membership status in bulk and validates complete per-user outcomes', async () => {
    const data = {
      summary: { requested: 2, activated: 1, deactivated: 0, failed: 1 },
      results: [
        { userId: 'user-1', status: 'ACTIVATED', message: 'Membership reactivated.' },
        { userId: 'user-2', status: 'FAILED', message: 'User was not found.' },
      ],
    };
    apiClientMock.post.mockResolvedValue(response(data));

    await expect(
      bulkUserService.changeMembershipStatus(['user-1', 'user-1', 'user-2'], 'ACTIVE'),
    ).resolves.toEqual(data);
    expect(apiClientMock.post).toHaveBeenCalledWith('/users/bulk-membership-status', {
      userIds: ['user-1', 'user-2'],
      status: 'ACTIVE',
    });
  });

  it('rejects malformed validation and unsupported deactivation status responses', async () => {
    const file = new File(['data'], 'users.csv');
    apiClientMock.post
      .mockResolvedValueOnce(response({ ...preview, limits: undefined }))
      .mockResolvedValueOnce(
        response({
          summary: { requested: 1, deactivated: 0, failed: 1 },
          results: [{ userId: 'user-1', status: 'UNKNOWN', message: 'No result.' }],
        }),
      )
      .mockResolvedValueOnce(
        response({
          ...preview,
          rows: [{ ...row, status: 'UNSUPPORTED' }],
        }),
      );

    await expect(bulkUserService.validateImport(file)).rejects.toThrow(
      'The bulk user API returned an unsupported response.',
    );
    await expect(bulkUserService.deactivateUsers(['user-1'])).rejects.toThrow(
      'The bulk user API returned an unsupported response.',
    );
    await expect(bulkUserService.validateImport(file)).rejects.toThrow(
      'The bulk user API returned an unsupported response.',
    );
  });

  it('requires the new preview and import summary counts', async () => {
    const file = new File(['data'], 'users.csv');
    const missingDuplicateCount = { ...preview, summary: { ...preview.summary } };
    delete (missingDuplicateCount.summary as Partial<typeof preview.summary>).duplicateRows;
    const missingFailedAssignmentCount = { ...importResult, summary: { ...importResult.summary } };
    delete (missingFailedAssignmentCount.summary as Partial<typeof importResult.summary>)
      .failedAssignments;
    apiClientMock.post
      .mockResolvedValueOnce(response(missingDuplicateCount))
      .mockResolvedValueOnce(response(missingFailedAssignmentCount));

    await expect(bulkUserService.validateImport(file)).rejects.toThrow(
      'The bulk user API returned an unsupported response.',
    );
    await expect(bulkUserService.confirmImport(file)).rejects.toThrow(
      'The bulk user API returned an unsupported response.',
    );
  });

  it('requires the exact deactivation summary shape and non-negative counts', async () => {
    apiClientMock.post
      .mockResolvedValueOnce(
        response({
          summary: { requested: 1, deactivated: 1, failed: 0, extra: 0 },
          results: [{ userId: 'user-1', status: 'DEACTIVATED', message: 'Done.' }],
        }),
      )
      .mockResolvedValueOnce(
        response({
          summary: { requested: 1, deactivated: -1, failed: 0 },
          results: [{ userId: 'user-1', status: 'DEACTIVATED', message: 'Done.' }],
        }),
      );

    await expect(bulkUserService.deactivateUsers(['user-1'])).rejects.toThrow(
      'The bulk user API returned an unsupported response.',
    );
    await expect(bulkUserService.deactivateUsers(['user-1'])).rejects.toThrow(
      'The bulk user API returned an unsupported response.',
    );
  });
});
