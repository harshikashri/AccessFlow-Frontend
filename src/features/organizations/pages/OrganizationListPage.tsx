import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { isPlatformSession } from '@/features/authorization/navigation';
import type {
  OrganizationListParams,
  OrganizationSortField,
  OrganizationSortOrder,
  OrganizationStatus,
} from '@/features/organizations/types/organization.types';
import {
  useOrganizationList,
  useOrganizationSummary,
} from '@/features/organizations/hooks/useOrganizations';
import { OrganizationSummaryCards } from '@/features/organizations/components/OrganizationSummaryCards';
import { OrganizationTable } from '@/features/organizations/components/OrganizationTable';
import { APP_ROUTES } from '@/routes/route.constants';

const pageSize = 10;

function OrganizationListContent({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrganizationStatus | ''>('');
  const [sortBy, setSortBy] = useState<OrganizationSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<OrganizationSortOrder>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo<OrganizationListParams>(
    () => ({
      page,
      limit: pageSize,
      search,
      ...(status ? { status } : {}),
      sortBy,
      sortOrder,
    }),
    [page, search, sortBy, sortOrder, status],
  );
  const listQuery = useOrganizationList(userId, params);
  const summaryQuery = useOrganizationSummary(userId);
  const pagination = listQuery.data?.pagination;
  const hasFilters = Boolean(searchInput.trim() || status);

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  }

  return (
    <div className="workspace-page organization-page">
      <PageHeader
        eyebrow="Platform"
        title="Organizations"
        description="Create and manage organizations across your AccessFlow platform."
        actions={
          <div className="organization-page__header-actions">
            <Button
              variant="outline"
              onClick={() => void Promise.all([listQuery.refetch(), summaryQuery.refetch()])}
              loading={listQuery.isFetching || summaryQuery.isFetching}
              aria-label="Refresh organizations"
            >
              Refresh
            </Button>
            <Button onClick={() => navigate(`${APP_ROUTES.organizations}/new`)}>
              Create organization
            </Button>
          </div>
        }
      />

      <OrganizationSummaryCards query={summaryQuery} />

      <Card
        title="Organization directory"
        description="Search by organization name, filter by status, or sort the paginated results."
        className="organization-directory"
      >
        <div className="organization-filters">
          <Input
            label="Search organizations"
            type="search"
            name="search"
            placeholder="Search by organization name"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Select
            label="Status"
            name="status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as OrganizationStatus | '');
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
          <Select
            label="Sort by"
            name="sortBy"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as OrganizationSortField);
              setPage(1);
            }}
            options={[
              { value: 'createdAt', label: 'Date created' },
              { value: 'updatedAt', label: 'Last updated' },
              { value: 'name', label: 'Name' },
              { value: 'status', label: 'Status' },
            ]}
          />
          <Select
            label="Sort order"
            name="sortOrder"
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as OrganizationSortOrder);
              setPage(1);
            }}
            options={[
              { value: 'desc', label: 'Descending' },
              { value: 'asc', label: 'Ascending' },
            ]}
          />
          {hasFilters && (
            <Button className="organization-filters__clear" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {listQuery.isError && !listQuery.data ? (
          <ErrorState
            title="Organizations could not be loaded"
            description={getAuthErrorMessage(
              listQuery.error,
              'The organization list is unavailable. Try again.',
            )}
            action={
              <Button variant="outline" onClick={() => void listQuery.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            {listQuery.isError && (
              <Alert variant="error" title="Could not refresh organizations">
                {getAuthErrorMessage(listQuery.error, 'Showing the most recently loaded results.')}
              </Alert>
            )}
            <OrganizationTable
              items={listQuery.data?.items ?? []}
              isLoading={listQuery.isPending}
              onClearFilters={clearFilters}
              hasFilters={hasFilters}
            />
            {pagination && pagination.total > 0 && (
              <div className="organization-pagination">
                <p>
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} organizations
                </p>
                <div className="organization-pagination__actions">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPreviousPage || listQuery.isFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                    onClick={() => setPage((current) => current + 1)}
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

export function OrganizationListPage() {
  const { user } = useAuth();

  if (!user || !isPlatformSession(user)) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  return <OrganizationListContent userId={user.id} />;
}
