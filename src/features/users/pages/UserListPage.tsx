import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Alert, Button, Card, Modal } from '@/components/ui';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthError, getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission, hasPermission } from '@/features/authorization/permissions';
import { useToast } from '@/components/ui/useToast';
import {
  useSetUserMembershipStatus,
  useUserDepartmentOptions,
  useUserList,
  useUserRoleCatalog,
} from '@/features/users/hooks/useUsers';
import { UserFilters } from '@/features/users/components/UserFilters';
import { UserTable } from '@/features/users/components/UserTable';
import type {
  UserListParams,
  UserProfile,
  UserSortField,
  UserSortOrder,
  UserStatus,
} from '@/features/users/types/user.types';
import { APP_ROUTES } from '@/routes/route.constants';

const pageSize = 10;

export function UserListPage() {
  const { user, authorizationStatus } = useAuth();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [sortBy, setSortBy] = useState<UserSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<UserSortOrder>('desc');
  const [page, setPage] = useState(1);
  const [membershipChange, setMembershipChange] = useState<{
    user: UserProfile;
    status: UserStatus;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo<UserListParams>(
    () => ({
      page,
      limit: pageSize,
      search,
      ...(status ? { status } : {}),
      ...(departmentId ? { departmentId: departmentId === 'null' ? null : departmentId } : {}),
      ...(roleId ? { roleId } : {}),
      sortBy,
      sortOrder,
    }),
    [departmentId, page, roleId, search, sortBy, sortOrder, status],
  );
  const organizationId = user?.organizationId ?? '';
  const canViewList = Boolean(
    user && hasPermission(user.authorization, 'users.view', 'organization-or-department'),
  );
  const actorId = canViewList ? (user?.id ?? '') : '';
  const listQuery = useUserList(actorId, canViewList ? organizationId : '', params);
  const departmentQuery = useUserDepartmentOptions(
    actorId,
    canViewList ? organizationId : '',
    canViewList,
  );
  const canLoadRoles = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.view'));
  const rolesQuery = useUserRoleCatalog(
    canLoadRoles ? (user?.id ?? '') : '',
    canLoadRoles ? organizationId : '',
    canLoadRoles,
  );
  const setMembershipStatus = useSetUserMembershipStatus(user?.id ?? '', organizationId);

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canViewList
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  const canCreate = hasOrganizationPermission(user.authorization, 'users.create');
  const pagination = listQuery.data?.pagination;
  const hasFilters = Boolean(searchInput.trim() || status || departmentId || roleId);

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setDepartmentId('');
    setRoleId('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  }

  async function confirmMembershipChange() {
    if (!membershipChange || setMembershipStatus.isPending) return;
    setActionError(null);
    try {
      await setMembershipStatus.mutateAsync({
        targetUserId: membershipChange.user.id,
        status: membershipChange.status,
      });
      showToast({
        title:
          membershipChange.status === 'ACTIVE'
            ? 'Membership reactivated'
            : 'Membership deactivated',
        description: `${membershipChange.user.name}'s organization membership was updated.`,
        variant: 'success',
      });
      setMembershipChange(null);
    } catch (error) {
      setActionError(
        getAuthErrorMessage(error, 'The organization membership could not be updated.'),
      );
    }
  }

  return (
    <div className="workspace-page user-page">
      <nav className="user-breadcrumb" aria-label="Breadcrumb">
        <span>Workspace</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Users</span>
      </nav>
      <PageHeader
        eyebrow="Organization"
        title="Users"
        description="Browse users who belong to this organization and are visible in your permission scope."
        actions={
          <div className="user-page__header-actions">
            <Button
              variant="outline"
              onClick={() => {
                void listQuery.refetch();
                void departmentQuery.refetch();
                if (canLoadRoles) void rolesQuery.refetch();
              }}
              loading={listQuery.isFetching || departmentQuery.isFetching || rolesQuery.isFetching}
              aria-label="Refresh users"
            >
              Refresh
            </Button>
            {canCreate && (
              <Link className="ui-button ui-button--primary" to={APP_ROUTES.newUser}>
                Add user
              </Link>
            )}
          </div>
        }
      />

      <Card
        title="User directory"
        description={
          pagination
            ? `${pagination.total} ${pagination.total === 1 ? 'user' : 'users'} in your current organization scope. Search and filter by account status, department, role, or sort order.`
            : 'Search and filter by account status, department, role, or sort order.'
        }
        className="user-directory"
      >
        <UserFilters
          search={searchInput}
          status={status}
          departmentId={departmentId}
          roleId={roleId}
          sortBy={sortBy}
          sortOrder={sortOrder}
          departments={departmentQuery.data ?? []}
          roles={rolesQuery.data ?? []}
          departmentsLoading={departmentQuery.isPending && !departmentQuery.data}
          rolesLoading={canLoadRoles && rolesQuery.isPending && !rolesQuery.data}
          departmentFilterError={
            departmentQuery.isError
              ? 'Department filtering is unavailable. Use Refresh to retry.'
              : null
          }
          roleFilterError={
            !canLoadRoles
              ? 'Role filtering requires organization-level role access.'
              : rolesQuery.isError
                ? getAuthError(rolesQuery.error).status === 403
                  ? 'Role filtering is not available for this account.'
                  : 'Role filtering is unavailable. Use Refresh to retry.'
                : null
          }
          hasFilters={hasFilters}
          onSearchChange={setSearchInput}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onDepartmentChange={(value) => {
            setDepartmentId(value);
            setPage(1);
          }}
          onRoleChange={(value) => {
            setRoleId(value);
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
        {listQuery.isError && !listQuery.data ? (
          <ErrorState
            title="Users could not be loaded"
            description={getAuthErrorMessage(listQuery.error, 'The user list is unavailable.')}
            action={
              <Button variant="outline" onClick={() => void listQuery.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            {listQuery.isError && (
              <Alert variant="error" title="Could not refresh users">
                {getAuthErrorMessage(listQuery.error, 'Showing the most recently loaded results.')}
              </Alert>
            )}
            <UserTable
              users={listQuery.data?.users ?? []}
              actor={user}
              isLoading={listQuery.isPending}
              hasFilters={hasFilters}
              canCreate={canCreate}
              onClearFilters={clearFilters}
              onSetMembershipStatus={(targetUser, nextStatus) => {
                setActionError(null);
                setMembershipChange({ user: targetUser, status: nextStatus });
              }}
            />
            {pagination && pagination.total > 0 && (
              <div className="user-pagination">
                <p>
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} users
                </p>
                <div className="user-pagination__actions">
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

      <Modal
        open={membershipChange !== null}
        title={
          membershipChange?.status === 'ACTIVE'
            ? 'Reactivate organization membership?'
            : 'Deactivate organization membership?'
        }
        description="This changes membership only in the current organization and revokes sessions for this organization on deactivation. It does not activate or deactivate the user's global account."
        onOpenChange={(open) => {
          if (!open && !setMembershipStatus.isPending) setMembershipChange(null);
        }}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setMembershipChange(null)}
              disabled={setMembershipStatus.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={membershipChange?.status === 'INACTIVE' ? 'destructive' : 'primary'}
              loading={setMembershipStatus.isPending}
              onClick={() => void confirmMembershipChange()}
            >
              {membershipChange?.status === 'ACTIVE'
                ? 'Reactivate membership'
                : 'Deactivate membership'}
            </Button>
          </>
        }
      >
        {actionError && (
          <Alert variant="error" title="Membership was not changed">
            {actionError}
          </Alert>
        )}
        <p>
          {membershipChange?.user.name} will{' '}
          {membershipChange?.status === 'ACTIVE' ? 'regain' : 'lose'} access to this organization
          when the change succeeds.
        </p>
      </Modal>
    </div>
  );
}
