import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import type {
  BulkImportPreviewRow,
  BulkImportRowStatus,
  BulkImportRowFilter,
} from '@/features/users/types/bulk-user.types';

const filters: { value: BulkImportRowFilter; label: string }[] = [
  { value: 'ALL', label: 'All rows' },
  { value: 'VALID', label: 'Valid' },
  { value: 'INVALID', label: 'Invalid' },
  { value: 'EXISTING', label: 'Existing users' },
  { value: 'DUPLICATE', label: 'Duplicates' },
];

function getStatusLabel(status: BulkImportRowStatus): string {
  const knownLabels: Record<BulkImportRowStatus, string> = {
    VALID: 'Valid',
    EXISTING: 'Existing user',
    ALREADY_EXISTS: 'Existing user',
    INVALID: 'Invalid',
    DUPLICATE: 'Duplicate',
    CREATED: 'Created',
    IMPORTED: 'Imported',
    INVITATION_FAILED: 'Invitation failed',
    FAILED: 'Failed',
    SKIPPED: 'Skipped',
  };
  return knownLabels[status];
}

function getStatusGroup(status: BulkImportRowStatus): BulkImportRowFilter | null {
  if (['VALID', 'CREATED', 'IMPORTED'].includes(status)) {
    return 'VALID';
  }
  if (['EXISTING', 'ALREADY_EXISTS'].includes(status)) {
    return 'EXISTING';
  }
  if (['INVALID', 'FAILED', 'SKIPPED', 'INVITATION_FAILED'].includes(status)) {
    return 'INVALID';
  }
  if (status === 'DUPLICATE') return 'DUPLICATE';
  return null;
}

interface ImportPreviewTableProps {
  rows: BulkImportPreviewRow[];
  filter: BulkImportRowFilter;
  onFilterChange: (filter: BulkImportRowFilter) => void;
}

export function ImportPreviewTable({ rows, filter, onFilterChange }: ImportPreviewTableProps) {
  const visibleRows =
    filter === 'ALL' ? rows : rows.filter((row) => getStatusGroup(row.status) === filter);

  return (
    <section className="bulk-import-preview" aria-label="Import preview">
      <div className="bulk-import-preview__filters" aria-label="Filter preview rows">
        {filters.map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? 'primary' : 'outline'}
            size="sm"
            aria-pressed={filter === option.value}
            onClick={() => onFilterChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div className="bulk-import-preview__table">
        <Table aria-label="Bulk import validation results">
          <TableHead>
            <TableRow>
              <TableHeader scope="col">CSV row</TableHeader>
              <TableHeader scope="col">Name</TableHeader>
              <TableHeader scope="col">Email</TableHeader>
              <TableHeader scope="col">Department</TableHeader>
              <TableHeader scope="col">Role</TableHeader>
              <TableHeader scope="col">Scope</TableHeader>
              <TableHeader scope="col">Status and details</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No rows match this filter.</TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => {
                const normalizedStatus = row.status.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                const name = `${row.firstName} ${row.lastName}`.trim();
                return (
                  <TableRow key={`${row.rowNumber}-${row.email}`}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{name || '—'}</TableCell>
                    <TableCell>{row.email || '—'}</TableCell>
                    <TableCell>{row.department || '—'}</TableCell>
                    <TableCell>{row.role || '—'}</TableCell>
                    <TableCell>
                      {row.scopeType === 'ORGANIZATION'
                        ? 'Organization'
                        : row.scopeType === 'DEPARTMENT'
                          ? 'Department'
                          : '—'}
                    </TableCell>
                    <TableCell>
                      <strong
                        className={`bulk-import-status bulk-import-status--${normalizedStatus}`}
                      >
                        {getStatusLabel(row.status)}
                      </strong>
                      {row.errors.length > 0 && (
                        <ul className="bulk-import-preview__errors">
                          {row.errors.map((error, index) => (
                            <li key={`${row.rowNumber}-error-${index}`}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="bulk-import-preview__count" aria-live="polite">
        Showing {visibleRows.length} of {rows.length} rows
      </p>
    </section>
  );
}
