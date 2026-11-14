import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Alert, Button, Card } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { APP_ROUTES } from '@/routes/route.constants';
import { RequestFilters } from '../components/RequestFilters';
import { RequestTable } from '../components/RequestTable';
import { useRequestList, useRequestTypes } from '../hooks/useRequests';
import type { RequestListParams, RequestStatus } from '../types/request.types';

const pageSize = 10;

export function RequestListPage({ mine = false }: { mine?: boolean }) {
  const { user, authorizationStatus } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [requestTypeId, setRequestTypeId] = useState('');
  const [page, setPage] = useState(1);
  const organizationId = user?.organizationId ?? '';
  const canView = Boolean(
    user && hasPermission(user.authorization, 'requests.view', 'organization-or-department'),
  );
  const canCreate = Boolean(
    user && hasPermission(user.authorization, 'requests.create', 'organization-or-department'),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo<RequestListParams>(
    () => ({
      page,
      limit: pageSize,
      search,
      ...(status ? { status } : {}),
      ...(requestTypeId ? { requestTypeId } : {}),
      ...(mine && user?.id ? { requesterId: user.id } : {}),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    [mine, page, requestTypeId, search, status, user?.id],
  );
  const listQuery = useRequestList(user?.id ?? '', organizationId, params, canView);
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

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setRequestTypeId('');
    setPage(1);
  }

  const pagination = listQuery.data?.pagination;
  const hasFilters = Boolean(searchInput.trim() || status || requestTypeId);
  return (
    <div className="workspace-page request-page">
      <nav className="request-breadcrumb" aria-label="Breadcrumb">
        <span>Workspace</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{mine ? 'My requests' : 'Requests'}</span>
      </nav>
      <PageHeader
        eyebrow="Requests"
        title={mine ? 'My requests' : 'Request center'}
        description={
          mine
            ? 'Track requests you created and their approval progress.'
            : 'Create, track, and manage requests within your authorized scope.'
        }
        actions={
          <div className="request-page__header-actions">
            <Button
              variant="outline"
              onClick={() => void listQuery.refetch()}
              loading={listQuery.isFetching}
            >
              Refresh
            </Button>
            {canCreate && (
              <Link className="ui-button ui-button--primary" to={APP_ROUTES.newRequest}>
                New request
              </Link>
            )}
          </div>
        }
      />
      <Card
        title={mine ? 'Personal request history' : 'All accessible requests'}
        description={
          pagination
            ? `${pagination.total} request${pagination.total === 1 ? '' : 's'} in the current scope.`
            : 'Search and filter requests using the controls below.'
        }
        className="request-directory"
      >
        <RequestFilters
          search={searchInput}
          status={status}
          requestTypeId={requestTypeId}
          requestTypes={typesQuery.data?.items ?? []}
          onSearchChange={setSearchInput}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onRequestTypeChange={(value) => {
            setRequestTypeId(value);
            setPage(1);
          }}
          onClear={clearFilters}
        />
        {listQuery.isError && !listQuery.data ? (
          <ErrorState
            title="Requests could not be loaded"
            description={getAuthErrorMessage(listQuery.error, 'The request list is unavailable.')}
            action={
              <Button variant="outline" onClick={() => void listQuery.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            {listQuery.isError && (
              <Alert variant="error" title="Could not refresh requests">
                {getAuthErrorMessage(listQuery.error, 'Showing the most recently loaded results.')}
              </Alert>
            )}
            <RequestTable
              items={listQuery.data?.items ?? []}
              isLoading={listQuery.isPending}
              hasFilters={hasFilters}
              onClearFilters={clearFilters}
            />
            {pagination && pagination.total > 0 && (
              <div className="request-pagination">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total}
                </span>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPreviousPage || listQuery.isFetching}
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
                    disabled={!pagination.hasNextPage || listQuery.isFetching}
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
