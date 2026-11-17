import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { IconButton } from '@/components/common/IconButton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Alert, Button, Card, Modal, Select } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission } from '@/features/authorization/permissions';
import { RoleAssignmentDialog } from '@/features/roles/components/RoleAssignmentDialog';
import { RoleFilters } from '@/features/roles/components/RoleFilters';
import { RoleTable } from '@/features/roles/components/RoleTable';
import { useAssignRole, useRoleList } from '@/features/roles/hooks/useRoles';
import type { ManagedRole, RoleListParams } from '@/features/roles/types/role.types';
import type { UserRoleAssignmentRequest } from '@/features/users/types/user.types';
import { APP_ROUTES } from '@/routes/route.constants';
import { useDebounce } from '@/hooks/useDebounce';

const pageSize = 10;

export function RoleListPage() {
  const { user, authorizationStatus, refreshCurrentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 250);
  const search = searchInput.trim() ? debouncedSearch : '';
  const [status, setStatus] = useState<NonNullable<RoleListParams['status']> | ''>('');
  const [sortBy, setSortBy] = useState<RoleListParams['sortBy']>('createdAt');
  const [sortOrder, setSortOrder] = useState<RoleListParams['sortOrder']>('desc');
  const [page, setPage] = useState(1);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ManagedRole | null>(null);

  const organizationId = user?.organizationId ?? '';
  const canView = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.view'));
  const canCreate = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.create'));
  const canEdit = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.edit'));
  const actorId = canView ? (user?.id ?? '') : '';
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
  const roleQuery = useRoleList(actorId, canView ? organizationId : '', params, canView);
  const assignRole = useAssignRole(actorId, organizationId, selectedRole?.id ?? '');
  const activeRoles = (roleQuery.data?.items ?? []).filter((role) => role.status === 'ACTIVE');

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
    setStatus('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  }

  async function submitAssignment(payload: UserRoleAssignmentRequest) {
    await assignRole.mutateAsync(payload);
    showToast({
      title: 'Role assigned',
      description: 'The assignment was saved with the selected scope.',
      variant: 'success',
    });
    if (payload.userId === user?.id) {
      try {
        await refreshCurrentUser();
      } catch (error) {
        showToast({
          title: 'Role assigned; access refresh failed',
          description: getAuthErrorMessage(
            error,
            'Retry refreshing your access before continuing.',
          ),
          variant: 'error',
        });
      }
    }
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
        actions={
          <div className="role-page__header-actions">
            <IconButton
              variant="outline"
              icon="refresh"
              label="Refresh roles"
              loading={roleQuery.isFetching}
              onClick={() => void roleQuery.refetch()}
            />
            {canEdit && (
              <Button
                variant="outline"
                disabled={roleQuery.isPending}
                onClick={() => {
                  setSelectedRole(null);
                  setRolePickerOpen(true);
                }}
              >
                Assign role
              </Button>
            )}
            {canCreate && <Button onClick={() => navigate(APP_ROUTES.newRole)}>Create role</Button>}
          </div>
        }
      />

      <Card title="Role directory">
        <RoleFilters
          search={searchInput}
          status={status}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSearchChange={(value) => {
            setSearchInput(value);
            setPage(1);
          }}
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
      <Modal
        open={rolePickerOpen}
        title="Select a role to assign"
        onOpenChange={setRolePickerOpen}
        footer={
          <>
            <Button variant="outline" onClick={() => setRolePickerOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedRole || roleQuery.isFetching}
              onClick={() => {
                if (!selectedRole) return;
                setRolePickerOpen(false);
                setAssignmentDialogOpen(true);
              }}
            >
              Continue
            </Button>
          </>
        }
      >
        {roleQuery.isError ? (
          <Alert variant="error" title="Roles could not be loaded">
            {getAuthErrorMessage(roleQuery.error, 'The role directory is unavailable.')}
            <Button variant="outline" size="sm" onClick={() => void roleQuery.refetch()}>
              Retry
            </Button>
          </Alert>
        ) : activeRoles.length === 0 ? (
          <p>No active roles are available in the current results.</p>
        ) : (
          <Select
            label="Role"
            name="assignmentRole"
            value={selectedRole?.id ?? ''}
            placeholder="Choose an active role"
            helperText="Choose an active role from this page."
            onChange={(event) =>
              setSelectedRole(activeRoles.find((role) => role.id === event.target.value) ?? null)
            }
            options={activeRoles.map((role) => ({ value: role.id, label: role.name }))}
          />
        )}
      </Modal>
      {selectedRole && (
        <RoleAssignmentDialog
          open={assignmentDialogOpen}
          role={selectedRole}
          isSaving={assignRole.isPending}
          onOpenChange={(open) => {
            setAssignmentDialogOpen(open);
            if (!open) setSelectedRole(null);
          }}
          onAssign={submitAssignment}
        />
      )}
    </div>
  );
}
