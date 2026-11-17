import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { IconButton } from '@/components/common/IconButton';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission, hasPermission } from '@/features/authorization/permissions';
import { useDepartmentList } from '@/features/departments/hooks/useDepartments';
import { DepartmentTable } from '@/features/departments/components/DepartmentTable';
import type {
  DepartmentListParams,
  DepartmentSortField,
  DepartmentSortOrder,
  DepartmentStatus,
} from '@/features/departments/types/department.types';
import { APP_ROUTES } from '@/routes/route.constants';
import { useDebounce } from '@/hooks/useDebounce';

const pageSize = 10;

export function DepartmentListPage() {
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const search = searchInput.trim() ? debouncedSearch : '';
  const [status, setStatus] = useState<DepartmentStatus | ''>('');
  const [sortBy, setSortBy] = useState<DepartmentSortField>('createdAt');
  const sortOrder: DepartmentSortOrder =
    sortBy === 'name' || sortBy === 'description' || sortBy === 'status' ? 'asc' : 'desc';
  const [page, setPage] = useState(1);

  const params = useMemo<DepartmentListParams>(
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
  const organizationId = user?.organizationId ?? '';
  const canViewList = Boolean(
    user && hasPermission(user.authorization, 'departments.view', 'organization-or-department'),
  );
  const listQuery = useDepartmentList(
    canViewList ? (user?.id ?? '') : '',
    canViewList ? organizationId : '',
    params,
  );

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canViewList
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  const canCreate = hasOrganizationPermission(user.authorization, 'departments.create');
  const pagination = listQuery.data?.pagination;
  const hasFilters = Boolean(searchInput.trim() || status || sortBy !== 'createdAt');

  function clearFilters() {
    setSearchInput('');
    setStatus('');
    setSortBy('createdAt');
    setPage(1);
  }

  return (
    <div className="workspace-page department-page">
      <nav className="department-breadcrumb" aria-label="Breadcrumb">
        <span>Workspace</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Departments</span>
      </nav>
      <PageHeader
        eyebrow="Organization"
        title="Departments"
        actions={
          <div className="department-page__header-actions">
            <IconButton
              variant="outline"
              icon="refresh"
              label="Refresh departments"
              onClick={() => void listQuery.refetch()}
              loading={listQuery.isFetching}
            />
            {canCreate && (
              <Button onClick={() => navigate(`${APP_ROUTES.departments}/new`)}>
                Create department
              </Button>
            )}
          </div>
        }
      />

      <Card title="Department directory" className="department-directory">
        <div className="department-filters">
          <Input
            label="Search departments"
            type="search"
            name="search"
            placeholder="Search by department name"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Status"
            name="status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as DepartmentStatus | '');
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
              setSortBy(event.target.value as DepartmentSortField);
              setPage(1);
            }}
            options={[
              { value: 'createdAt', label: 'Date created' },
              { value: 'updatedAt', label: 'Last updated' },
              { value: 'name', label: 'Name' },
              { value: 'description', label: 'Description' },
              { value: 'status', label: 'Status' },
            ]}
          />
          {hasFilters && (
            <Button className="department-filters__clear" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {listQuery.isError && !listQuery.data ? (
          <ErrorState
            title="Departments could not be loaded"
            description={getAuthErrorMessage(
              listQuery.error,
              'The department list is unavailable. Try again.',
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
              <Alert variant="error" title="Could not refresh departments">
                {getAuthErrorMessage(listQuery.error, 'Showing the most recently loaded results.')}
              </Alert>
            )}
            <DepartmentTable
              items={listQuery.data?.items ?? []}
              isLoading={listQuery.isPending}
              hasFilters={hasFilters}
              canCreate={canCreate}
              onClearFilters={clearFilters}
            />
            {pagination && pagination.total > 0 && (
              <div className="department-pagination">
                <p>
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} departments
                </p>
                <div className="department-pagination__actions">
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
