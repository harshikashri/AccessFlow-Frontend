import { useEffect, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { IconButton } from '@/components/common/IconButton';
import { Alert, Button, Modal } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { useBulkUserImport } from '@/features/users/hooks/useUsers';
import type {
  BulkImportPreview,
  BulkImportResult,
  BulkImportRowFilter,
} from '@/features/users/types/bulk-user.types';
import { ImportPreviewTable } from './ImportPreviewTable';
import { APP_ROUTES } from '@/routes/route.constants';
import {
  buildBulkImportDetailedReport,
  hasBulkImportFailedRows,
} from '@/features/users/utils/bulk-import-report';

const maxFileSize = 512 * 1024;
const maxRows = 500;

interface BulkImportDialogProps {
  open: boolean;
  actorId: string;
  organizationId: string;
  onOpenChange: (open: boolean) => void;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KiB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function BulkImportDialog({
  open,
  actorId,
  organizationId,
  onOpenChange,
}: BulkImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkImportPreview | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [filter, setFilter] = useState<BulkImportRowFilter>('ALL');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const bulkImport = useBulkUserImport(actorId, organizationId);
  const isPending =
    bulkImport.downloadTemplate.isPending ||
    bulkImport.validateImport.isPending ||
    bulkImport.confirmImport.isPending;

  useEffect(() => {
    if (!open && !isPending) {
      setFile(null);
      setPreview(null);
      setResult(null);
      setFilter('ALL');
      setShowConfirmation(false);
      setFileError(null);
      setActionError(null);
    }
  }, [isPending, open]);

  function chooseFile(candidate: File | undefined) {
    if (!candidate) return;
    setFileError(null);
    setActionError(null);
    setPreview(null);
    setResult(null);
    setShowConfirmation(false);
    if (!candidate.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setFileError('Choose a CSV file with a .csv filename extension.');
      return;
    }
    if (candidate.size > maxFileSize) {
      setFile(null);
      setFileError('The selected file is larger than the 512 KiB limit.');
      return;
    }
    setFile(candidate);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function downloadTemplate() {
    setActionError(null);
    try {
      const blob = await bulkImport.downloadTemplate.mutateAsync();
      downloadBlob(blob, 'accessflow-users-template.csv');
    } catch (error) {
      setActionError(getAuthErrorMessage(error, 'The CSV template could not be downloaded.'));
    }
  }

  async function validateFile() {
    if (!file || bulkImport.validateImport.isPending) return;
    setActionError(null);
    setFilter('ALL');
    try {
      setPreview(await bulkImport.validateImport.mutateAsync(file));
    } catch (error) {
      setActionError(getAuthErrorMessage(error, 'The CSV file could not be validated.'));
    }
  }

  async function confirmImport() {
    if (!preview || preview.summary.validUsers === 0 || bulkImport.confirmImport.isPending) {
      return;
    }
    setActionError(null);
    try {
      if (!file) return;
      setResult(await bulkImport.confirmImport.mutateAsync(file));
      setShowConfirmation(false);
    } catch (error) {
      setActionError(getAuthErrorMessage(error, 'The import could not be completed.'));
    }
  }

  function downloadFailedRows() {
    if (!result) return;
    setActionError(null);
    try {
      if (!result.errorReport.csv) {
        setActionError(
          'The server reported failed rows but did not include CSV content. Download the detailed report for row outcomes and errors.',
        );
        return;
      }
      downloadBlob(
        new Blob([result.errorReport.csv], { type: result.errorReport.contentType }),
        result.errorReport.filename,
      );
    } catch (error) {
      setActionError(getAuthErrorMessage(error, 'The failed rows CSV could not be downloaded.'));
    }
  }

  function downloadDetailedErrorReport() {
    if (!result) return;
    setActionError(null);
    try {
      downloadBlob(
        new Blob([buildBulkImportDetailedReport(result, preview)], {
          type: 'text/csv;charset=utf-8',
        }),
        'accessflow-bulk-import-detailed-error-report.csv',
      );
    } catch (error) {
      setActionError(
        getAuthErrorMessage(error, 'The detailed error report could not be downloaded.'),
      );
    }
  }

  function requestClose(nextOpen: boolean) {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  }

  const activeStage = result ? 5 : showConfirmation ? 4 : preview ? 3 : file ? 2 : 1;
  const steps = [
    'Download template',
    'Upload CSV',
    'Validate and preview',
    'Confirm import',
    'Results',
  ];

  return (
    <Modal
      open={open}
      title="Bulk import users"
      description="Upload a CSV to validate new user records and role assignments before importing."
      onOpenChange={requestClose}
      size="lg"
      footer={
        <Button variant="outline" onClick={() => requestClose(false)} disabled={isPending}>
          {result ? 'Return to user management' : 'Close'}
        </Button>
      }
    >
      <ol className="bulk-import-steps" aria-label="Bulk import steps">
        {steps.map((step, index) => (
          <li
            key={step}
            className={index + 1 === activeStage ? 'bulk-import-steps__active' : undefined}
            aria-current={index + 1 === activeStage ? 'step' : undefined}
          >
            <span>{index + 1}</span> {step}
          </li>
        ))}
      </ol>

      {actionError && (
        <Alert variant="error" title="Bulk import needs attention">
          {actionError}
        </Alert>
      )}

      {result ? (
        <section className="bulk-import-result" aria-label="Import results">
          <h3>Import complete</h3>
          <p>
            Processed {result.summary.totalRows} rows. Some records may have been skipped or may
            require follow-up.
          </p>
          <dl className="bulk-import-summary">
            <div>
              <dt>Total rows processed</dt>
              <dd>{result.summary.totalRows}</dd>
            </div>
            <div>
              <dt>Users created</dt>
              <dd>{result.summary.usersCreated}</dd>
            </div>
            <div>
              <dt>Role assignments created</dt>
              <dd>{result.summary.assignmentsCreated}</dd>
            </div>
            <div>
              <dt>Failed role assignments</dt>
              <dd>{result.summary.failedAssignments}</dd>
            </div>
            <div>
              <dt>Existing users skipped</dt>
              <dd>{result.summary.existingUsersSkipped}</dd>
            </div>
            <div>
              <dt>Invalid users skipped</dt>
              <dd>{result.summary.invalidUsersSkipped}</dd>
            </div>
            <div>
              <dt>Failed users</dt>
              <dd>{result.summary.failedUsers}</dd>
            </div>
            <div>
              <dt>Invitation emails sent</dt>
              <dd>{result.summary.invitations.sent}</dd>
            </div>
            <div>
              <dt>Invitation email failures</dt>
              <dd>{result.summary.invitations.failed}</dd>
            </div>
          </dl>
          {result.rows.length > 0 && (
            <ImportPreviewTable rows={result.rows} filter={filter} onFilterChange={setFilter} />
          )}
          <div className="bulk-import-result__downloads">
            {hasBulkImportFailedRows(result, preview) && (
              <Button variant="outline" onClick={downloadFailedRows}>
                Download failed rows CSV
              </Button>
            )}
            <Button variant="outline" onClick={downloadDetailedErrorReport}>
              Download detailed error report
            </Button>
          </div>
          <Link
            className="ui-button ui-button--primary"
            to={APP_ROUTES.users}
            onClick={() => requestClose(false)}
          >
            Return to User Management
          </Link>
        </section>
      ) : showConfirmation && preview ? (
        <section className="bulk-import-confirmation" aria-label="Confirm import">
          <h3>Confirm import</h3>
          <p>
            Import valid records and skip rows with errors. Existing users will not be overwritten.
          </p>
          <dl className="bulk-import-summary">
            <div>
              <dt>New users to create</dt>
              <dd>{preview.summary.validUsers}</dd>
            </div>
            <div>
              <dt>Role assignments to create</dt>
              <dd>{preview.summary.validAssignments}</dd>
            </div>
            <div>
              <dt>Existing users to skip</dt>
              <dd>{preview.summary.existingUsers}</dd>
            </div>
            <div>
              <dt>Invalid users to skip</dt>
              <dd>{preview.summary.invalidUsers}</dd>
            </div>
            <div>
              <dt>Rows to skip due to errors</dt>
              <dd>{preview.summary.invalidRows}</dd>
            </div>
            <div>
              <dt>Duplicate rows to skip</dt>
              <dd>{preview.summary.duplicateRows}</dd>
            </div>
          </dl>
          <p>
            Server limits for this upload: {Math.ceil(preview.limits.maxBytes / 1024)} KiB and{' '}
            {preview.limits.maxRows.toLocaleString()} data rows.
          </p>
          {preview.summary.validUsers === 0 && (
            <Alert variant="warning" title="No new users can be imported">
              Correct the file and validate it again before confirming.
            </Alert>
          )}
          <div className="bulk-import-actions">
            <IconButton
              variant="outline"
              icon="arrow-left"
              label="Back to preview"
              onClick={() => setShowConfirmation(false)}
              disabled={isPending}
            />
            <Button
              variant="primary"
              onClick={() => void confirmImport()}
              loading={bulkImport.confirmImport.isPending}
              disabled={preview.summary.validUsers === 0}
            >
              Import valid users
            </Button>
          </div>
        </section>
      ) : preview ? (
        <section className="bulk-import-validation" aria-label="Validation preview">
          <h3>Review validation results</h3>
          <p>
            Invalid and duplicate rows will be skipped. Review every row before importing; the
            server will re-check assignments when you confirm.
          </p>
          <dl className="bulk-import-summary">
            <div>
              <dt>Total data rows</dt>
              <dd>{preview.summary.totalRows}</dd>
            </div>
            <div>
              <dt>Valid new users</dt>
              <dd>{preview.summary.validUsers}</dd>
            </div>
            <div>
              <dt>Existing users</dt>
              <dd>{preview.summary.existingUsers}</dd>
            </div>
            <div>
              <dt>Invalid users</dt>
              <dd>{preview.summary.invalidUsers}</dd>
            </div>
            <div>
              <dt>Valid role assignments</dt>
              <dd>{preview.summary.validAssignments}</dd>
            </div>
            <div>
              <dt>Invalid rows</dt>
              <dd>{preview.summary.invalidRows}</dd>
            </div>
            <div>
              <dt>Duplicate rows</dt>
              <dd>{preview.summary.duplicateRows}</dd>
            </div>
          </dl>
          <ImportPreviewTable rows={preview.rows} filter={filter} onFilterChange={setFilter} />
          <div className="bulk-import-actions">
            <Button variant="outline" onClick={() => setPreview(null)} disabled={isPending}>
              Choose a different file
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowConfirmation(true)}
              disabled={bulkImport.confirmImport.isPending}
            >
              Review and confirm
            </Button>
          </div>
        </section>
      ) : (
        <section className="bulk-import-upload">
          <div className="bulk-import-template">
            <div>
              <h3>1. Download the template</h3>
              <p>
                Use the provided headers and role-scope examples. Do not include organization IDs.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void downloadTemplate()}
              loading={bulkImport.downloadTemplate.isPending}
              disabled={isPending}
            >
              Download CSV template
            </Button>
          </div>
          <h3>2. Upload your CSV</h3>
          <p>
            CSV, UTF-8 or UTF-8 with BOM; maximum {maxFileSize / 1024} KiB and{' '}
            {maxRows.toLocaleString()} data rows. The server validates the file contents and row
            limit.
          </p>
          <div
            className={`bulk-import-dropzone${isDragging ? ' bulk-import-dropzone--active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <p>Drag and drop a CSV file here, or choose a file from your device.</p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              Choose CSV file
            </Button>
          </div>
          {fileError && (
            <p className="form-field__error" role="alert">
              {fileError}
            </p>
          )}
          {file && (
            <div className="bulk-import-selected-file">
              <span>
                {file.name} · {formatFileSize(file.size)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setFileError(null);
                  setActionError(null);
                }}
              >
                Remove file
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
              >
                Replace file
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            className="bulk-import-file-input"
            type="file"
            accept=".csv,text/csv"
            aria-label="Choose CSV file"
            onChange={onFileChange}
          />
          <div className="bulk-import-actions">
            <Button
              variant="primary"
              onClick={() => void validateFile()}
              loading={bulkImport.validateImport.isPending}
              disabled={!file || isPending}
            >
              Validate file
            </Button>
          </div>
        </section>
      )}
    </Modal>
  );
}
