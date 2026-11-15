import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { useRequestTypes } from '@/features/requests/hooks/useRequests';
import { APP_ROUTES } from '@/routes/route.constants';
import { useWorkflowList } from '../hooks/useWorkflows';
import { WorkflowStatusBadge } from '../components/WorkflowStatusBadge';
import { formatWorkflowCondition } from '../components/workflow-form.utils';
import { useDebounce } from '@/hooks/useDebounce';

const pageSize = 10;

export function WorkflowListPage() {
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const search = searchInput.trim() ? debouncedSearch : '';
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [requestTypeId, setRequestTypeId] = useState('');
  const [page, setPage] = useState(1);
  const organizationId = user?.organizationId ?? '';
  const canView = Boolean(
    user && hasPermission(user.authorization, 'workflows.view', 'organization'),
  );
  const canManage = Boolean(
    user && hasPermission(user.authorization, 'workflows.manage', 'organization'),
  );

  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      search,
      ...(status ? { isActive: status === 'ACTIVE' } : {}),
      ...(requestTypeId ? { requestTypeId } : {}),
    }),
    [page, requestTypeId, search, status],
  );
  const query = useWorkflowList(user?.id ?? '', organizationId, params, canView);
  const typesQuery = useRequestTypes(user?.id ?? '', organizationId, canView);

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canView
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  const pagination = query.data?.pagination;
  const hasFilters = Boolean(searchInput.trim() || status || requestTypeId);
  const clearFilters = () => {
    setSearchInput('');
    setStatus('');
    setRequestTypeId('');
    setPage(1);
  };

  return (
    <div className="workspace-page workflow-page">
      <PageHeader
        eyebrow="Organization"
        title="Workflows"
        description="Configure conditional approval rules, priorities, and the organization fallback."
        actions={
          canManage ? (
            <Button onClick={() => navigate(`${APP_ROUTES.workflows}/new`)}>Create workflow</Button>
          ) : undefined
        }
      />
      <Card
        title="Workflow directory"
        description="Search and filter the active approval policies in this organization."
      >
        <div className="workflow-filters">
          <Input
            label="Search workflows"
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
            placeholder="Search by workflow name"
          />
          <Select
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as 'ACTIVE' | 'INACTIVE' | '');
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
          <Select
            label="Request type"
            value={requestTypeId}
            onChange={(event) => {
              setRequestTypeId(event.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All request types' },
              ...(typesQuery.data?.items ?? []).map((type) => ({
                value: type.id,
                label: type.name,
              })),
            ]}
          />
          {hasFilters && (
            <Button variant="ghost" className="workflow-filters__clear" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        {query.isError && !query.data ? (
          <ErrorState
            title="Workflows could not be loaded"
            description={getAuthErrorMessage(query.error, 'The workflow directory is unavailable.')}
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            {query.isError && (
              <Alert variant="error" title="Could not refresh workflows">
                {getAuthErrorMessage(query.error, 'Showing the most recently loaded workflows.')}
              </Alert>
            )}
            {query.isPending ? (
              <div className="workflow-loading" aria-label="Loading workflows">
                Loading workflows…
              </div>
            ) : query.data?.items.length ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Workflow</TableHeader>
                    <TableHeader>Request type</TableHeader>
                    <TableHeader>Selection rule</TableHeader>
                    <TableHeader>Stages</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Updated</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {query.data.items.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <Link
                          className="workflow-table__link"
                          to={`${APP_ROUTES.workflows}/${workflow.id}`}
                        >
                          <strong>{workflow.name}</strong>
                          <span>
                            {workflow.isDefault
                              ? 'Organization default'
                              : `Version ${workflow.version}`}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {typesQuery.data?.items.find((type) => type.id === workflow.requestTypeId)
                          ?.name ??
                          (workflow.isDefault ? 'All request types' : 'Request type unavailable')}
                      </TableCell>
                      <TableCell>
                        {workflow.isDefault
                          ? 'Fallback only'
                          : workflow.selectionCondition
                            ? `${formatWorkflowCondition(
                                workflow.selectionCondition,
                                typesQuery.data?.items.find(
                                  (type) => type.id === workflow.requestTypeId,
                                )?.fields ?? [],
                              )} · Priority ${workflow.priority}`
                            : `All requests · Priority ${workflow.priority}`}
                      </TableCell>
                      <TableCell>{workflow.stages.length}</TableCell>
                      <TableCell>
                        <WorkflowStatusBadge workflow={workflow} />
                      </TableCell>
                      <TableCell>{new Date(workflow.updatedAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableBody>
                  <TableEmptyState colSpan={6}>
                    <strong>
                      {hasFilters ? 'No matching workflows' : 'No workflows configured'}
                    </strong>
                    <p>
                      {hasFilters
                        ? 'Try adjusting your filters.'
                        : 'Create a workflow to define how requests are approved.'}
                    </p>
                    {!hasFilters && canManage && (
                      <Button size="sm" onClick={() => navigate(`${APP_ROUTES.workflows}/new`)}>
                        Create workflow
                      </Button>
                    )}
                  </TableEmptyState>
                </TableBody>
              </Table>
            )}
            {pagination && pagination.total > 0 && (
              <div className="workflow-pagination">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total}
                </span>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || query.isFetching}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages || query.isFetching}
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
