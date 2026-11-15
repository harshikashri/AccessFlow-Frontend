import { describe, expect, it } from 'vitest';
import {
  buildBulkImportDetailedReport,
  hasBulkImportFailedRows,
} from '@/features/users/utils/bulk-import-report';
import type { BulkImportResult } from '@/features/users/types/bulk-user.types';

const result: BulkImportResult = {
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
  rows: [
    {
      rowNumber: 2,
      firstName: '  =2+2',
      lastName: 'User',
      email: 'taylor@example.com',
      department: null,
      role: 'Reviewer',
      scopeType: 'ORGANIZATION',
      status: 'IMPORTED',
      errors: ['@SUM(A1:A2)'],
    },
  ],
  errorReport: {
    filename: 'failed.csv',
    contentType: 'text/csv',
    csv: 'rowNumber,email,error\r\n',
  },
};

describe('bulk import detailed report', () => {
  it('includes summary and row outcomes while neutralizing formula-like cells', () => {
    const report = buildBulkImportDetailedReport(result);

    expect(report).toContain('"SUMMARY","Failed assignments","0"');
    expect(report).toContain('"ROW"');
    expect(report).toContain(`"'  =2+2"`);
    expect(report).toContain(`"'@SUM(A1:A2)"`);
  });

  it('neutralizes formulas preceded by control characters and a byte-order mark', () => {
    const report = buildBulkImportDetailedReport({
      ...result,
      rows: [{ ...result.rows[0]!, firstName: '\u0000\uFEFF=1+1' }],
    });

    expect(report).toContain(`"'\u0000\uFEFF=1+1"`);
  });

  it('does not treat a header-only server CSV as failed rows', () => {
    const successfulRow = result.rows[0]!;
    const successfulResult = {
      ...result,
      rows: [{ ...successfulRow, errors: [] }],
    };
    expect(hasBulkImportFailedRows(successfulResult)).toBe(false);
    expect(
      hasBulkImportFailedRows({
        ...successfulResult,
        rows: [{ ...successfulRow, status: 'INVITATION_FAILED', errors: [] }],
      }),
    ).toBe(true);
    expect(
      hasBulkImportFailedRows({
        ...successfulResult,
        summary: { ...successfulResult.summary, failedAssignments: 1 },
      }),
    ).toBe(true);
    expect(
      hasBulkImportFailedRows({
        ...successfulResult,
        rows: [{ ...successfulRow, status: 'EXISTING', errors: ['Existing user was skipped.'] }],
      }),
    ).toBe(false);
  });
});
