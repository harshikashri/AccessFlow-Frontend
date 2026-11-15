import type { BulkImportPreview, BulkImportResult } from '@/features/users/types/bulk-user.types';

function formulaSafeCell(value: string | number): string {
  const text = String(value);
  const safeText =
    typeof value === 'string' && /^[\s\p{Cc}\uFEFF]*[=+\-@]/u.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function csvRow(values: (string | number)[]): string {
  return values.map(formulaSafeCell).join(',');
}

export function hasBulkImportFailedRows(
  result: BulkImportResult,
  preview?: BulkImportPreview | null,
): boolean {
  const { summary, rows } = result;
  return (
    (preview?.summary.duplicateRows ?? 0) > 0 ||
    (preview?.summary.invalidRows ?? 0) > 0 ||
    summary.invalidUsersSkipped > 0 ||
    summary.failedUsers > 0 ||
    summary.failedAssignments > 0 ||
    summary.invitations.failed > 0 ||
    rows.some((row) =>
      ['INVALID', 'DUPLICATE', 'FAILED', 'INVITATION_FAILED', 'SKIPPED'].includes(row.status),
    )
  );
}

export function buildBulkImportDetailedReport(
  result: BulkImportResult,
  preview?: BulkImportPreview | null,
): string {
  const rows = [
    csvRow([
      'Section',
      'Field',
      'Value',
      'CSV row',
      'First name',
      'Last name',
      'Email',
      'Department',
      'Role',
      'Scope',
      'Status',
      'Errors',
    ]),
    ...[
      ['Import ID', result.importId],
      ['Total rows', result.summary.totalRows],
      ['Duplicate preview rows', preview?.summary.duplicateRows ?? 0],
      ['Invalid preview rows', preview?.summary.invalidRows ?? 0],
      ['Users created', result.summary.usersCreated],
      ['Role assignments created', result.summary.assignmentsCreated],
      ['Failed assignments', result.summary.failedAssignments],
      ['Existing users skipped', result.summary.existingUsersSkipped],
      ['Invalid users skipped', result.summary.invalidUsersSkipped],
      ['Failed users', result.summary.failedUsers],
      ['Invitation emails sent', result.summary.invitations.sent],
      ['Invitation email failures', result.summary.invitations.failed],
    ].map(([field, value]) =>
      csvRow(['SUMMARY', String(field), String(value), '', '', '', '', '', '', '', '', '']),
    ),
    ...result.rows.map((row) =>
      csvRow([
        'ROW',
        '',
        '',
        row.rowNumber,
        row.firstName,
        row.lastName,
        row.email,
        row.department ?? '',
        row.role ?? '',
        row.scopeType ?? '',
        row.status,
        row.errors.join(' | '),
      ]),
    ),
  ];

  return `${rows.join('\r\n')}\r\n`;
}
