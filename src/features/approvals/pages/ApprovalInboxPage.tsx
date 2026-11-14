import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
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
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { APP_ROUTES } from '@/routes/route.constants';
import { useApprovalInbox } from '../hooks/useApprovals';
import type { ApprovalInboxParams, ApprovalStatus } from '../types/approval.types';

export function ApprovalInboxPage() {
  const { user, authorizationStatus } = useAuth();
  const [category, setCategory] = useState<ApprovalInboxParams['category']>('pending_action');
  const [status, setStatus] = useState<ApprovalStatus | ''>('');
  const [page, setPage] = useState(1);
  const organizationId = user?.organizationId ?? '';
  const canApprove = Boolean(
    user && hasPermission(user.authorization, 'requests.approve', 'organization-or-department'),
  );
  const params = useMemo<ApprovalInboxParams>(
    () => ({
      page,
      limit: 10,
      category: category ?? 'pending_action',
      ...(status ? { status } : {}),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    [category, page, status],
  );
  const query = useApprovalInbox(user?.id ?? '', organizationId, params, canApprove);

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canApprove
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  const pagination = query.data?.pagination;
  return (
    <div className="workspace-page approval-page">
      <nav className="approval-breadcrumb" aria-label="Breadcrumb">
        <span>Requests</span>
        <span aria-hidden="true">/</span>
        <span>Approvals</span>
      </nav>
      <PageHeader
        eyebrow="Approval management"
        title="Approval inbox"
        description="Review requests assigned to you or delegated to you, without bypassing the workflow engine."
        actions={
          <Button variant="outline" onClick={() => void query.refetch()} loading={query.isFetching}>
            Refresh
          </Button>
        }
      />
      <Card
        title="Approval tasks"
        description={
          pagination
            ? `${pagination.total} approval task${pagination.total === 1 ? '' : 's'} in this view.`
            : 'Filter approval tasks by assignment and status.'
        }
      >
        <div className="approval-filters">
          <Select
            label="View"
            name="approval-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as ApprovalInboxParams['category']);
              setPage(1);
            }}
            options={[
              { value: 'pending_action', label: 'Pending action' },
              { value: 'available', label: 'Available to claim' },
              { value: 'assigned', label: 'Claimed by me' },
              { value: 'completed', label: 'Completed by me' },
              { value: 'all', label: 'All relevant tasks' },
            ]}
          />
          <Select
            label="Status"
            name="approval-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ApprovalStatus | '');
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              ...(
                ['ACTIVE', 'CLAIMED', 'APPROVED', 'REJECTED', 'RETURNED'] as ApprovalStatus[]
              ).map((value) => ({ value, label: value.replace('_', ' ') })),
            ]}
          />
        </div>
        {query.isError && !query.data ? (
          <ErrorState
            title="Approval inbox unavailable"
            description={getAuthErrorMessage(query.error, 'Approval tasks could not be loaded.')}
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            {query.isError && (
              <Alert variant="error" title="Could not refresh approvals">
                {getAuthErrorMessage(query.error, 'Showing the last loaded approval tasks.')}
              </Alert>
            )}
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Request</TableHeader>
                  <TableHeader>Stage</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Requester</TableHeader>
                  <TableHeader>Updated</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.isPending ? (
                  <TableLoadingState columns={5} rows={6} />
                ) : query.data?.items.length ? (
                  query.data.items.map((step) => (
                    <TableRow key={step.id}>
                      <TableCell>
                        <Link
                          className="approval-table__link"
                          to={`${APP_ROUTES.approvals}/${step.id}`}
                        >
                          <strong>{step.request?.requestNumber || step.requestId}</strong>
                          <span>{step.request?.title || 'Request details'}</span>
                        </Link>
                      </TableCell>
                      <TableCell>{step.stageName}</TableCell>
                      <TableCell>
                        <span
                          className={`approval-status approval-status--${step.status.toLowerCase()}`}
                        >
                          {step.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {step.request?.requesterId ? String(step.request.requesterId) : '—'}
                      </TableCell>
                      <TableCell>
                        {step.decisionAt
                          ? new Date(step.decisionAt).toLocaleDateString()
                          : 'Awaiting action'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="approval-empty">No approval tasks match this view.</div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {pagination && pagination.total > 0 && (
              <div className="approval-pagination">
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
