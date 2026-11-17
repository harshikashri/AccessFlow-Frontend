import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { AppIcon } from '@/components/common/AppIcon';
import { IconButton } from '@/components/common/IconButton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Alert, Button, Card, Modal } from '@/components/ui';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthError, getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import {
  hasOrganizationPermission,
  hasPermission,
  isDepartmentMember,
} from '@/features/authorization/permissions';
import { useToast } from '@/components/ui/useToast';
import {
  useSetUserMembershipStatus,
  useUserDepartmentOptions,
  useUserList,
  useUserRoleCatalog,
} from '@/features/users/hooks/useUsers';
import { UserFilters } from '@/features/users/components/UserFilters';
import { UserTable } from '@/features/users/components/UserTable';
import { BulkImportDialog } from '@/features/users/components/BulkImportDialog';
import { BulkMembershipDialog } from '@/features/users/components/BulkMembershipDialog';
import { canManageUserMembership } from '@/features/users/utils/user.utils';
import type {
  UserListParams,
  UserProfile,
  UserSortField,
  UserSortOrder,
  UserStatus,
} from '@/features/users/types/user.types';
import { APP_ROUTES } from '@/routes/route.constants';
import { useDebounce } from '@/hooks/useDebounce';

const pageSize = 10;

function getUserSortOrder(sortBy: UserSortField): UserSortOrder {
  return sortBy === 'name' || sortBy === 'email' || sortBy === 'accountStatus' ? 'asc' : 'desc';
}

export function UserListPage() {
  const { user, authorizationStatus } = useAuth();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const search = searchInput.trim() ? debouncedSearch : '';
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [sortBy, setSortBy] = useState<UserSortField>('createdAt');
  const sortOrder = getUserSortOrder(sortBy);
  const [page, setPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set());
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkMembershipStatus, setBulkMembershipStatus] = useState<UserStatus | null>(null);
  const [membershipChange, setMembershipChange] = useState<{
    user: UserProfile;
    status: UserStatus;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const departmentMember = user ? isDepartmentMember(user.authorization) : false;

  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [departmentId, organizationId, page, roleId, search, searchInput, sortBy, status]);

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
  const canViewList = Boolean(
    user && hasPermission(user.authorization, 'users.view', 'organization-or-department'),
  );
  const actorId = canViewList ? (user?.id ?? '') : '';
  const listQuery = useUserList(actorId, canViewList ? organizationId : '', params);
  const departmentQuery = useUserDepartmentOptions(
    actorId,
    canViewList ? organizationId : '',
    canViewList && !departmentMember,
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
  const canBulkChangeMembership = hasOrganizationPermission(user.authorization, 'users.deactivate');
  const visibleUsers = listQuery.data?.users ?? [];
  const selectedUsers = visibleUsers.filter((targetUser) => selectedUserIds.has(targetUser.id));
  const selectedActiveUsers = selectedUsers.filter(
    (targetUser) => targetUser.membership.status === 'ACTIVE',
  );
  const selectedInactiveUsers = selectedUsers.filter(
    (targetUser) => targetUser.membership.status === 'INACTIVE',
  );
  const pagination = listQuery.data?.pagination;
  const hasFilters = Boolean(
    searchInput.trim() || status || departmentId || roleId || sortBy !== 'createdAt',
  );

  function clearFilters() {
    setSelectedUserIds(new Set());
    setSearchInput('');
    setStatus('');
    setDepartmentId('');
    setRoleId('');
    setSortBy('createdAt');
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
        description={
          departmentMember
            ? 'View users in your department and organization-level roles.'
            : 'Browse users who belong to this organization and are visible in your permission scope.'
        }
        actions={
          <div className="user-page__header-actions">
            <IconButton
              variant="outline"
              icon="refresh"
              label="Refresh users"
              onClick={() => {
                void listQuery.refetch();
                if (!departmentMember) void departmentQuery.refetch();
                if (canLoadRoles) void rolesQuery.refetch();
              }}
              loading={
                listQuery.isFetching ||
                departmentQuery.isFetching ||
                (canLoadRoles && rolesQuery.isFetching)
              }
            />
            {canCreate && (
              <>
                <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                  Bulk import
                </Button>
                <Link className="user-page__add-user" to={APP_ROUTES.newUser} aria-label="Add user">
                  <AppIcon name="add" size={18} />
                </Link>
              </>
            )}
          </div>
        }
      />

      <Card
        title="User directory"
        {...(departmentMember
          ? {}
          : {
              description: pagination
                ? `${pagination.total} ${pagination.total === 1 ? 'user' : 'users'} in your current organization scope. Search, filter, and sort the authorized results.`
                : 'Search, filter, and sort the authorized results.',
            })}
        className="user-directory"
      >
        <UserFilters
          search={searchInput}
          status={status}
          departmentId={departmentId}
          roleId={roleId}
          sortBy={sortBy}
          departments={departmentQuery.data ?? []}
          roles={departmentMember ? (listQuery.data?.roleOptions ?? []) : (rolesQuery.data ?? [])}
          departmentsLoading={
            !departmentMember && departmentQuery.isPending && !departmentQuery.data
          }
          rolesLoading={canLoadRoles && rolesQuery.isPending && !rolesQuery.data}
          hideDepartmentFilter={departmentMember}
          departmentFilterError={
            !departmentMember && departmentQuery.isError
              ? 'Department filtering is unavailable. Use Refresh to retry.'
              : null
          }
          roleFilterError={
            !departmentMember && !canLoadRoles
              ? 'Role filtering requires organization-level role access.'
              : !departmentMember && rolesQuery.isError
                ? getAuthError(rolesQuery.error).status === 403
                  ? 'Role filtering is not available for this account.'
                  : 'Role filtering is unavailable. Use Refresh to retry.'
                : null
          }
          hasFilters={hasFilters}
          onSearchChange={(value) => {
            setSelectedUserIds(new Set());
            setSearchInput(value);
            setPage(1);
          }}
          onStatusChange={(value) => {
            setSelectedUserIds(new Set());
            setStatus(value);
            setPage(1);
          }}
          onDepartmentChange={(value) => {
            setSelectedUserIds(new Set());
            setDepartmentId(value);
            setPage(1);
          }}
          onRoleChange={(value) => {
            setSelectedUserIds(new Set());
            setRoleId(value);
            setPage(1);
          }}
          onSortByChange={(value) => {
            setSelectedUserIds(new Set());
            setSortBy(value);
            setPage(1);
          }}
          onClear={clearFilters}
        />
        {canBulkChangeMembership && selectedUserIds.size > 0 && (
          <div className="bulk-user-toolbar" aria-live="polite">
            <p>
              {selectedUserIds.size} {selectedUserIds.size === 1 ? 'user' : 'users'} selected on
              this page
            </p>
            <div>
              <Button variant="outline" size="sm" onClick={() => setSelectedUserIds(new Set())}>
                Clear selection
              </Button>
              {selectedActiveUsers.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkMembershipStatus('INACTIVE')}
                >
                  Deactivate {selectedActiveUsers.length} active
                </Button>
              )}
              {selectedInactiveUsers.length > 0 && (
                <Button size="sm" onClick={() => setBulkMembershipStatus('ACTIVE')}>
                  Reactivate {selectedInactiveUsers.length} inactive
                </Button>
              )}
            </div>
          </div>
        )}
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
              readOnlyDirectory={departmentMember}
              onClearFilters={clearFilters}
              {...(canBulkChangeMembership
                ? {
                    selection: {
                      selectedIds: selectedUserIds,
                      canSelectUser: (targetUser) =>
                        targetUser.id !== user.id &&
                        (targetUser.membership.status === 'ACTIVE' ||
                          targetUser.membership.status === 'INACTIVE') &&
                        canManageUserMembership(user, targetUser.membership.departmentId),
                      onToggle: (targetUserId, selected) => {
                        setSelectedUserIds((current) => {
                          const next = new Set(current);
                          if (selected) next.add(targetUserId);
                          else next.delete(targetUserId);
                          return next;
                        });
                      },
                      onSelectPage: (userIds, selected) => {
                        setSelectedUserIds((current) => {
                          const next = new Set(current);
                          for (const targetUserId of userIds) {
                            if (selected) next.add(targetUserId);
                            else next.delete(targetUserId);
                          }
                          return next;
                        });
                      },
                    },
                  }
                : {})}
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
                    onClick={() => {
                      setSelectedUserIds(new Set());
                      setPage((current) => Math.max(1, current - 1));
                    }}
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
                    onClick={() => {
                      setSelectedUserIds(new Set());
                      setPage((current) => current + 1);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <BulkImportDialog
        open={isBulkImportOpen}
        actorId={user.id}
        organizationId={organizationId}
        onOpenChange={setIsBulkImportOpen}
      />
      <BulkMembershipDialog
        open={bulkMembershipStatus !== null}
        users={bulkMembershipStatus === 'ACTIVE' ? selectedInactiveUsers : selectedActiveUsers}
        status={bulkMembershipStatus ?? 'INACTIVE'}
        actorId={user.id}
        organizationId={organizationId}
        onOpenChange={(open) => {
          if (!open) setBulkMembershipStatus(null);
        }}
        onComplete={() => setSelectedUserIds(new Set())}
      />

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
          {membershipChange?.status === 'ACTIVE'
            ? `${membershipChange.user.name}'s membership will be active. They can access the organization once their global account is active and password setup is complete.`
            : `${membershipChange?.user.name ?? 'The user'} will lose access to this organization when the change succeeds.`}
        </p>
      </Modal>
    </div>
  );
}
