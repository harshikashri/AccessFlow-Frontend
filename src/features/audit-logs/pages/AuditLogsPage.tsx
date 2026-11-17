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
import { IconButton } from '@/components/common/IconButton';
import { PageHeader } from '@/components/common/PageHeader';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { useAuth } from '@/features/auth/context/useAuth';
import { hasPermission } from '@/features/authorization/permissions';
import { APP_ROUTES } from '@/routes/route.constants';
import { useAuditLogs, useAuditStatistics, usePlatformAuditLogs } from '../hooks/useAuditLogs';
import { auditLogService } from '../services/audit-log.service';
import type { AuditListParams } from '../types/audit-log.types';
import { useDebounce } from '@/hooks/useDebounce';
import { useOrganizationOptions } from '@/features/organizations/hooks/useOrganizations';

const PLATFORM_ACTION_OPTIONS = [
  { value: 'ORGANIZATION_CREATED', label: 'Organization created' },
  { value: 'ORGANIZATION_UPDATED', label: 'Organization updated' },
  { value: 'ORGANIZATION_ACTIVATED', label: 'Organization activated' },
  { value: 'ORGANIZATION_DEACTIVATED', label: 'Organization deactivated' },
  { value: 'ORGANIZATION_ADMIN_CREATED', label: 'Organization Admin created' },
];

const ORGANIZATION_ACTION_VALUES = [
  'APPROVAL_CANCELLED',
  'APPROVAL_CLAIM_EXPIRED',
  'APPROVAL_CLAIMED',
  'APPROVAL_ESCALATED',
  'APPROVAL_GRANTED',
  'APPROVAL_OVERDUE',
  'APPROVAL_REMINDER_SENT',
  'APPROVAL_REJECTED',
  'APPROVAL_RESOLUTION_FAILED',
  'APPROVAL_STAGE_ACTIVATED',
  'APPROVAL_STAGES_CREATED',
  'BULK_USER_DEACTIVATION_COMPLETED',
  'BULK_USER_DEACTIVATION_FAILED',
  'BULK_USER_DEACTIVATION_INITIATED',
  'BULK_USER_IMPORT_COMPLETED',
  'BULK_USER_IMPORT_COMPLETED_WITH_FAILURES',
  'BULK_USER_IMPORT_FAILED',
  'BULK_USER_IMPORT_INITIATED',
  'BULK_USER_MEMBERSHIP_STATUS_COMPLETED',
  'BULK_USER_MEMBERSHIP_STATUS_FAILED',
  'BULK_USER_MEMBERSHIP_STATUS_INITIATED',
  'DELEGATION_CREATED',
  'DELEGATION_REVOKED',
  'DELEGATION_UPDATED',
  'DEPARTMENT_ACTIVATED',
  'DEPARTMENT_CREATED',
  'DEPARTMENT_DEACTIVATED',
  'DEPARTMENT_MANAGER_ASSIGNED',
  'DEPARTMENT_MANAGER_REMOVED',
  'DEPARTMENT_MEMBER_ADDED',
  'DEPARTMENT_MEMBER_REMOVED',
  'DEPARTMENT_UPDATED',
  'LOGIN_SUCCEEDED',
  'LOGOUT',
  'LOGOUT_ALL',
  'NOTIFICATION_PREFERENCES_UPDATED',
  'ORGANIZATION_ACTIVATED',
  'ORGANIZATION_ADMIN_CREATED',
  'ORGANIZATION_CREATED',
  'ORGANIZATION_DEACTIVATED',
  'ORGANIZATION_UPDATED',
  'PREFERENCES_UPDATED',
  'PROFILE_UPDATED',
  'REQUEST_APPROVED',
  'REQUEST_CANCELLED',
  'REQUEST_CREATED',
  'REQUEST_RESUBMITTED',
  'REQUEST_RETURNED',
  'REQUEST_SUBMITTED',
  'REQUEST_TYPE_ACTIVATED',
  'REQUEST_TYPE_CREATED',
  'REQUEST_TYPE_DEACTIVATED',
  'REQUEST_TYPE_UPDATED',
  'REQUEST_UPDATED',
  'ROLE_ACTIVATED',
  'ROLE_ASSIGNMENT_SCOPE_UPDATED',
  'ROLE_ASSIGNED',
  'ROLE_CREATED',
  'ROLE_DEACTIVATED',
  'ROLE_PERMISSIONS_UPDATED',
  'ROLE_UNASSIGNED',
  'ROLE_UPDATED',
  'SESSION_REVOKED',
  'USER_ACTIVATED',
  'USER_ADMIN_PASSWORD_RESET_REQUESTED',
  'USER_CREATED',
  'USER_DEACTIVATED',
  'USER_DEPARTMENT_ASSIGNED',
  'USER_DEPARTMENT_REMOVED',
  'USER_PASSWORD_RESET_COMPLETED',
  'USER_PASSWORD_RESET_REQUESTED',
  'USER_PASSWORD_SETUP_COMPLETED',
  'USER_ROLE_ASSIGNED',
  'USER_UPDATED',
  'WORKFLOW_ACTIVATED',
  'WORKFLOW_CREATED',
  'WORKFLOW_DEFAULT_INITIALIZED',
  'WORKFLOW_DEACTIVATED',
  'WORKFLOW_UPDATED',
];

function formatActionLabel(action: string): string {
  return action
    .split('_')
    .map((word) => `${word.charAt(0)}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

export function AuditLogsPage() {
  const { user, authorizationStatus } = useAuth();
  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN';
  const canView = Boolean(
    user &&
    (isSuperAdmin ||
      hasPermission(user.authorization, 'audit_logs.view', 'organization-or-department')),
  );
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const search = searchInput.trim() ? debouncedSearch : '';
  const [action, setAction] = useState('');
  const [organizationId, setOrganizationId] = useState('');
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
      ...(isSuperAdmin && organizationId ? { organizationId } : {}),
      ...(!isSuperAdmin && resourceType ? { resourceType } : {}),
    }),
    [action, isSuperAdmin, organizationId, page, resourceType, search],
  );
  const enabled = authorizationStatus === 'available' && canView;
  const organizationOptions = useOrganizationOptions(isSuperAdmin ? (user?.id ?? '') : '');
  const organizationQuery = useAuditLogs(params, enabled && !isSuperAdmin);
  const platformQuery = usePlatformAuditLogs(params, enabled && isSuperAdmin);
  const query = isSuperAdmin ? platformQuery : organizationQuery;
  const statistics = useAuditStatistics(enabled && !isSuperAdmin);
  const organizationActionOptions = [
    ...new Set([
      ...ORGANIZATION_ACTION_VALUES,
      ...(statistics.data?.byAction ?? []).map(({ action: actionName }) => actionName),
    ]),
  ]
    .map((actionName) => ({
      value: actionName,
      label: formatActionLabel(actionName),
    }))
    .sort((first, second) => first.label.localeCompare(second.label));

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
        <span>{isSuperAdmin ? 'Platform' : 'Organization'}</span>
        <span aria-hidden="true">/</span>
        <span>Audit logs</span>
      </nav>
      <PageHeader
        title="Audit logs"
        description={
          isSuperAdmin
            ? 'Review platform administration activity performed by Super Admins.'
            : 'Review authorized activity without exposing sensitive credentials or tokens.'
        }
        actions={
          <>
            {!isSuperAdmin && (
              <Button variant="outline" onClick={() => void exportLogs()} loading={exporting}>
                Export CSV
              </Button>
            )}
            <IconButton
              variant="outline"
              icon="refresh"
              label="Refresh audit logs"
              onClick={() => void query.refetch()}
              loading={query.isFetching}
            />
          </>
        }
      />
      {exportError && (
        <Alert variant="error" title="Export failed">
          {exportError}
        </Alert>
      )}
      {isSuperAdmin && organizationOptions.isError && (
        <Alert variant="error" title="Organizations unavailable">
          Could not load organizations for filtering.{' '}
          <Button variant="outline" size="sm" onClick={() => void organizationOptions.refetch()}>
            Retry
          </Button>
        </Alert>
      )}
      {!isSuperAdmin && (
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
      )}
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
            placeholder={isSuperAdmin ? 'Search platform audit logs' : 'Action or resource ID'}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
          {isSuperAdmin ? (
            <>
              <Select
                label="Organization"
                name="audit-organization"
                placeholder="All organizations"
                value={organizationId}
                disabled={organizationOptions.isPending || organizationOptions.isError}
                onChange={(event) => {
                  setOrganizationId(event.target.value);
                  setPage(1);
                }}
                options={(organizationOptions.data ?? []).map((organization) => ({
                  value: organization.id,
                  label: organization.name,
                }))}
              />
              <Select
                label="Action"
                name="audit-action"
                placeholder="All platform actions"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setPage(1);
                }}
                options={PLATFORM_ACTION_OPTIONS}
              />
            </>
          ) : (
            <>
              <Select
                label="Action"
                name="audit-action"
                placeholder="All actions"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setPage(1);
                }}
                options={organizationActionOptions}
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
            </>
          )}
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
                  <TableHeader>{isSuperAdmin ? 'Date and time' : 'Timestamp'}</TableHeader>
                  {isSuperAdmin ? (
                    <>
                      <TableHeader>Action</TableHeader>
                      <TableHeader>Description</TableHeader>
                      <TableHeader>Performed by</TableHeader>
                      <TableHeader>Target entity</TableHeader>
                    </>
                  ) : (
                    <>
                      <TableHeader>Actor</TableHeader>
                      <TableHeader>Action</TableHeader>
                      <TableHeader>Resource</TableHeader>
                      <TableHeader>Context</TableHeader>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {query.isPending ? (
                  <TableLoadingState columns={5} rows={8} />
                ) : query.data?.items.length ? (
                  query.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                      {isSuperAdmin ? (
                        <>
                          <TableCell>
                            <span className="audit-badge">{item.action}</span>
                          </TableCell>
                          <TableCell>
                            {item.description || `${item.action} — ${item.resourceType}`}
                          </TableCell>
                          <TableCell>{item.actor?.name || item.actorId || 'Unknown'}</TableCell>
                          <TableCell>
                            {item.resourceType}
                            {item.organization?.name ? ` · ${item.organization.name}` : ''}
                            <span className="audit-link">{item.resourceId}</span>
                          </TableCell>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="audit-empty">
                        {isSuperAdmin
                          ? 'No Super Admin audit events match the current filters.'
                          : 'No audit events match the current filters.'}
                      </div>
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
