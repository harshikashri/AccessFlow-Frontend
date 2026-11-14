import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Alert, Button, Card } from '@/components/ui';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission } from '@/features/authorization/permissions';
import { RoleFilters } from '@/features/roles/components/RoleFilters';
import { RoleTable } from '@/features/roles/components/RoleTable';
import { useRoleList } from '@/features/roles/hooks/useRoles';
import type { RoleListParams } from '@/features/roles/types/role.types';
import { APP_ROUTES } from '@/routes/route.constants';

const pageSize = 10;

export function RoleListPage() {
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<NonNullable<RoleListParams['status']> | ''>('');
  const [sortBy, setSortBy] = useState<RoleListParams['sortBy']>('createdAt');
  const [sortOrder, setSortOrder] = useState<RoleListParams['sortOrder']>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const organizationId = user?.organizationId ?? '';
  const canView = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.view'));
  const canCreate = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.create'));
  const canEdit = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.edit'));
  const params = useMemo<RoleListParams>(
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
  const roleQuery = useRoleList(
    canView ? (user?.id ?? '') : '',
    canView ? organizationId : '',
    params,
    canView,
  );

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
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  }

  const pagination = roleQuery.data?.pagination;
  const hasFilters = Boolean(searchInput.trim() || status);

  return (
    <div className="workspace-page role-page">
      <nav className="role-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.dashboard}>Workspace</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Roles and permissions</span>
      </nav>
      <PageHeader
        eyebrow="Organization"
        title="Roles and permissions"
        description="Manage organization role definitions and the permissions assigned to them."
        actions={
          <div className="role-page__header-actions">
            <Button
              variant="outline"
              loading={roleQuery.isFetching}
              onClick={() => void roleQuery.refetch()}
            >
              Refresh
            </Button>
            {canCreate && <Button onClick={() => navigate(APP_ROUTES.newRole)}>Create role</Button>}
          </div>
        }
      />

      <Card
        title="Role directory"
        description="Roles are scoped to this organization. Use the supported search, status, and sort controls to find a role."
      >
        <RoleFilters
          search={searchInput}
          status={status}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSearchChange={setSearchInput}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onSortByChange={(value) => {
            setSortBy(value);
            setPage(1);
          }}
          onSortOrderChange={(value) => {
            setSortOrder(value);
            setPage(1);
          }}
          onClear={clearFilters}
        />
        {roleQuery.isError ? (
          <ErrorState
            title="Roles could not be loaded"
            description={getAuthErrorMessage(
              roleQuery.error,
              'The role management API is unavailable for this account.',
            )}
            action={
              <Button variant="outline" onClick={() => void roleQuery.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            <RoleTable
              roles={roleQuery.data?.items ?? []}
              isLoading={roleQuery.isPending && !roleQuery.data}
              canEdit={canEdit}
              hasFilters={hasFilters}
            />
            {pagination && pagination.totalPages > 0 && (
              <div className="role-pagination">
                <p>
                  {pagination.total === 0
                    ? 'No roles'
                    : `Page ${pagination.page} of ${pagination.totalPages} · ${pagination.total} role${pagination.total === 1 ? '' : 's'}`}
                </p>
                <div className="role-pagination__actions">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPreviousPage || roleQuery.isFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage || roleQuery.isFetching}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        {roleQuery.isError && canCreate && (
          <Alert variant="information" title="Creating a role is still available">
            You may create a role if you have roles.create access, even while the directory is
            unavailable.
          </Alert>
        )}
      </Card>
    </div>
  );
}
