import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableLoadingState,
} from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { useAuth } from '@/features/auth/context/useAuth';
import { hasPermission } from '@/features/authorization/permissions';
import { APP_ROUTES } from '@/routes/route.constants';
import { useAuditLogs, useAuditStatistics } from '../hooks/useAuditLogs';
import { auditLogService } from '../services/audit-log.service';
import type { AuditListParams } from '../types/audit-log.types';

export function AuditLogsPage() {
  const { user, authorizationStatus } = useAuth();
  const canView = Boolean(
    user && hasPermission(user.authorization, 'audit_logs.view', 'organization-or-department'),
  );
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const params = useMemo<AuditListParams>(
    () => ({
      page,
      limit: 25,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      ...(search ? { search } : {}),
      ...(action ? { action } : {}),
      ...(resourceType ? { resourceType } : {}),
    }),
    [action, page, resourceType, search],
  );
  const query = useAuditLogs(params, authorizationStatus === 'available' && canView);
  const statistics = useAuditStatistics(authorizationStatus === 'available' && canView);

  async function exportLogs() {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await auditLogService.exportCsv(params);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'accessflow-audit.csv';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(getAuthErrorMessage(error, 'The audit export could not be downloaded.'));
    } finally {
      setExporting(false);
    }
  }

  if (authorizationStatus !== 'available' || !user || !canView)
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  const pagination = query.data?.pagination;
  return (
    <div className="workspace-page audit-page">
      <nav className="audit-breadcrumb" aria-label="Breadcrumb">
        <span>Organization</span>
        <span aria-hidden="true">/</span>
        <span>Audit logs</span>
      </nav>
      <PageHeader
        eyebrow="Governance"
        title="Audit logs"
        description="Review authorized platform activity without exposing sensitive credentials or tokens."
        actions={
          <>
            <Button variant="outline" onClick={() => void exportLogs()} loading={exporting}>
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              loading={query.isFetching}
            >
              Refresh
            </Button>
          </>
        }
      />
      {exportError && (
        <Alert variant="error" title="Export failed">
          {exportError}
        </Alert>
      )}
      <div className="audit-stat-grid">
        <Card title="Total events">
          <strong className="audit-stat">{statistics.data?.total ?? '—'}</strong>
        </Card>
        <Card title="Today">
          <strong className="audit-stat">{statistics.data?.today ?? '—'}</strong>
        </Card>
        <Card title="Last 7 days">
          <strong className="audit-stat">{statistics.data?.week ?? '—'}</strong>
        </Card>
      </div>
      <Card
        title="Activity history"
        description={
          pagination
            ? `${pagination.total} events match the current view.`
            : 'Search and filter authorized activity.'
        }
      >
        <div className="audit-filters">
          <Input
            label="Search"
            name="audit-search"
            placeholder="Action or resource ID"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Input
            label="Action"
            name="audit-action"
            placeholder="e.g. REQUEST_SUBMITTED"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Resource type"
            name="audit-resource-type"
            value={resourceType}
            onChange={(event) => {
              setResourceType(event.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All resources' },
              'User',
              'Organization',
              'Department',
              'Role',
              'Request',
              'ApprovalStep',
              'Session',
            ].map((value) =>
              typeof value === 'string' ? { value, label: value || 'All resources' } : value,
            )}
          />
        </div>
        {query.isError && !query.data ? (
          <ErrorState
            title="Audit logs unavailable"
            description={getAuthErrorMessage(query.error, 'Audit logs could not be loaded.')}
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            {query.isError && (
              <Alert variant="error" title="Could not refresh audit logs">
                {getAuthErrorMessage(query.error, 'Showing the last loaded events.')}
              </Alert>
            )}
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Timestamp</TableHeader>
                  <TableHeader>Actor</TableHeader>
                  <TableHeader>Action</TableHeader>
                  <TableHeader>Resource</TableHeader>
                  <TableHeader>Context</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.isPending ? (
                  <TableLoadingState columns={5} rows={8} />
                ) : query.data?.items.length ? (
                  query.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{item.actor?.name || item.actorId || 'System'}</TableCell>
                      <TableCell>
                        <span className="audit-badge">{item.action}</span>
                      </TableCell>
                      <TableCell>
                        <Link className="audit-link" to={`${APP_ROUTES.auditLogs}/${item.id}`}>
                          {item.resourceType}
                          <span>{item.resourceId}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {item.organization?.name || item.organizationId || 'Platform'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="audit-empty">No audit events match the current filters.</div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {pagination && pagination.total > 0 && (
              <div className="audit-pagination">
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
