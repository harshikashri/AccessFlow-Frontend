import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Alert, Button, Card, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission } from '@/features/authorization/permissions';
import { AssignedUsersTable } from '@/features/roles/components/AssignedUsersTable';
import { PermissionMatrix } from '@/features/roles/components/PermissionMatrix';
import { RoleAssignmentDialog } from '@/features/roles/components/RoleAssignmentDialog';
import { RoleAssignmentScopeDialog } from '@/features/roles/components/RoleAssignmentScopeDialog';
import { RoleOverview } from '@/features/roles/components/RoleOverview';
import {
  useAssignRole,
  usePermissionCatalog,
  useRemoveRoleAssignment,
  useRoleDetails,
  useRoleUsers,
  useSetRoleStatus,
  useUpdateRoleAssignment,
} from '@/features/roles/hooks/useRoles';
import type { RoleStatus, RoleUserAssignment } from '@/features/roles/types/role.types';
import { isBuiltInRole, isRoleId } from '@/features/roles/utils/role.utils';
import { APP_ROUTES } from '@/routes/route.constants';

const pageSize = 10;

export function RoleDetailsPage() {
  const { user, authorizationStatus, refreshCurrentUser } = useAuth();
  const { roleId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [statusToSet, setStatusToSet] = useState<RoleStatus | null>(null);
  const [assignmentToRemove, setAssignmentToRemove] = useState<RoleUserAssignment | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<RoleUserAssignment | null>(null);
  const organizationId = user?.organizationId ?? '';
  const canView = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.view'));
  const canEdit = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.edit'));
  const actorId = canView ? (user?.id ?? '') : '';
  const validRoleId = isRoleId(roleId);
  const roleQuery = useRoleDetails(actorId, organizationId, roleId, canView && validRoleId);
  const role = roleQuery.data;
  const permissionQuery = usePermissionCatalog(
    role ? actorId : '',
    role ? organizationId : '',
    Boolean(role),
  );
  const usersQuery = useRoleUsers(
    role ? actorId : '',
    role ? organizationId : '',
    roleId,
    page,
    pageSize,
    Boolean(role),
  );
  const setStatus = useSetRoleStatus(actorId, organizationId, roleId);
  const assignRole = useAssignRole(actorId, organizationId, roleId);
  const removeAssignment = useRemoveRoleAssignment(actorId, organizationId);
  const updateAssignment = useUpdateRoleAssignment(actorId, organizationId);

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking role access" />;
  }
  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canView
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  if (!validRoleId) {
    return (
      <div className="workspace-page role-page">
        <ErrorState
          title="Role link is invalid"
          description="The role identifier in this URL is not valid."
          action={
            <Button variant="outline" onClick={() => navigate(APP_ROUTES.roles)}>
              Back to roles
            </Button>
          }
        />
      </div>
    );
  }
  if (roleQuery.isPending) {
    return <LoadingState label="Loading role details" />;
  }
  if (roleQuery.isError || !role) {
    return (
      <div className="workspace-page role-page">
        <ErrorState
          title="Role could not be loaded"
          description={getAuthErrorMessage(
            roleQuery.error,
            'This role is unavailable in your current organization or permission scope.',
          )}
          action={
            <div className="role-page__inline-actions">
              <Button variant="outline" onClick={() => void roleQuery.refetch()}>
                Retry
              </Button>
              <Button variant="ghost" onClick={() => navigate(APP_ROUTES.roles)}>
                Back to roles
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const currentUser = user;
  const currentRole = role;
  const canViewUserProfiles = hasOrganizationPermission(currentUser.authorization, 'users.view');
  const isBuiltIn = isBuiltInRole(currentRole);
  const canChangeStatus = canEdit && !isBuiltIn;

  async function refreshAccessAfterSave() {
    try {
      await refreshCurrentUser();
    } catch (error) {
      showToast({
        title: 'Changes saved; access refresh failed',
        description: getAuthErrorMessage(error, 'Retry refreshing your access before continuing.'),
        variant: 'error',
      });
    }
  }

  async function confirmStatusChange() {
    if (!statusToSet || setStatus.isPending) return;
    try {
      await setStatus.mutateAsync(statusToSet);
      setStatusToSet(null);
      showToast({
        title: statusToSet === 'ACTIVE' ? 'Role activated' : 'Role deactivated',
        description:
          statusToSet === 'ACTIVE'
            ? 'The custom role can be assigned again.'
            : 'Existing assignments remain recorded; the backend recalculates effective access.',
        variant: 'success',
      });
      await refreshAccessAfterSave();
    } catch (error) {
      showToast({
        title: 'Role status was not changed',
        description: getAuthErrorMessage(error, 'The role status could not be changed.'),
        variant: 'error',
      });
    }
  }

  async function submitAssignment(payload: Parameters<typeof assignRole.mutateAsync>[0]) {
    await assignRole.mutateAsync(payload);
    showToast({
      title: 'Role assigned',
      description: 'The assignment was saved with the selected scope.',
      variant: 'success',
    });
    if (payload.userId === currentUser.id) await refreshAccessAfterSave();
  }

  async function confirmAssignmentRemoval() {
    if (!assignmentToRemove || removeAssignment.isPending) return;
    try {
      await removeAssignment.mutateAsync({
        roleId: currentRole.id,
        userId: assignmentToRemove.userId,
        scope: {
          scopeType: assignmentToRemove.scopeType,
          ...(assignmentToRemove.scopeType === 'DEPARTMENT' && assignmentToRemove.departmentId
            ? { departmentId: assignmentToRemove.departmentId }
            : {}),
        },
      });
      const affectedUserId = assignmentToRemove.userId;
      setAssignmentToRemove(null);
      showToast({
        title: 'Role assignment removed',
        description: 'The assignment was marked inactive. The user account was not deleted.',
        variant: 'success',
      });
      if (affectedUserId === currentUser.id) await refreshAccessAfterSave();
    } catch (error) {
      showToast({
        title: 'Role assignment was not removed',
        description: getAuthErrorMessage(
          error,
          'The role assignment could not be removed. The backend may be protecting essential administrator access.',
        ),
        variant: 'error',
      });
    }
  }

  return (
    <div className="workspace-page role-page">
      <nav className="role-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.roles}>Roles and permissions</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{role.name}</span>
      </nav>
      <PageHeader
        eyebrow={isBuiltIn ? 'Built-in role' : 'Custom role'}
        title={role.name}
        description={role.description || 'No description provided.'}
        actions={
          <div className="role-page__header-actions">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`${APP_ROUTES.roles}/${role.id}/edit`)}
              >
                Edit role
              </Button>
            )}
            {canChangeStatus && (
              <Button
                variant={role.status === 'ACTIVE' ? 'destructive' : 'primary'}
                onClick={() => setStatusToSet(role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
              >
                {role.status === 'ACTIVE' ? 'Deactivate role' : 'Activate role'}
              </Button>
            )}
          </div>
        }
      />

      {isBuiltIn && (
        <Alert variant="information" title="Built-in role">
          Built-in role names and activation states are managed by the platform. This backend allows
          only the role-specific configuration shown below.
        </Alert>
      )}
      <RoleOverview role={role} />

      <Card
        title="Permissions in this role"
        description="These are role-definition permissions, not the complete effective permissions of any individual user."
      >
        {permissionQuery.isPending ? (
          <LoadingState label="Loading permission definitions" />
        ) : permissionQuery.isError || !permissionQuery.data ? (
          <Alert variant="error" title="Permission definitions could not be loaded">
            {getAuthErrorMessage(
              permissionQuery.error,
              'The backend permission catalog is unavailable.',
            )}
            <Button variant="outline" size="sm" onClick={() => void permissionQuery.refetch()}>
              Retry
            </Button>
          </Alert>
        ) : (
          <PermissionMatrix
            modules={permissionQuery.data.modules}
            value={role.permissions}
            readOnly
          />
        )}
      </Card>

      <Card
        title="Assigned users"
        description="Assignments carry their own organization or department scope. Inactive assignment records remain visible for context."
        action={
          canEdit && role.status === 'ACTIVE' ? (
            <Button onClick={() => setAssignmentDialogOpen(true)}>Assign role</Button>
          ) : undefined
        }
      >
        {usersQuery.isError ? (
          <Alert variant="error" title="Role assignments could not be loaded">
            {getAuthErrorMessage(
              usersQuery.error,
              'The role assignment API is unavailable for this account.',
            )}
            <Button variant="outline" size="sm" onClick={() => void usersQuery.refetch()}>
              Retry
            </Button>
          </Alert>
        ) : (
          <AssignedUsersTable
            assignments={usersQuery.data?.items ?? []}
            {...(usersQuery.data?.pagination ? { pagination: usersQuery.data.pagination } : {})}
            isLoading={usersQuery.isPending && !usersQuery.data}
            canManage={canEdit}
            canViewProfiles={canViewUserProfiles}
            isRemoving={removeAssignment.isPending}
            onRemove={setAssignmentToRemove}
            onEdit={setAssignmentToEdit}
            onPageChange={setPage}
          />
        )}
      </Card>

      <RoleAssignmentDialog
        open={assignmentDialogOpen}
        role={role}
        isSaving={assignRole.isPending}
        onOpenChange={setAssignmentDialogOpen}
        onAssign={submitAssignment}
      />

      <RoleAssignmentScopeDialog
        open={assignmentToEdit !== null}
        role={currentRole}
        assignment={assignmentToEdit}
        actorId={actorId}
        organizationId={organizationId}
        isSaving={updateAssignment.isPending}
        onOpenChange={(open) => {
          if (!updateAssignment.isPending && !open) setAssignmentToEdit(null);
        }}
        onUpdate={async (payload) => {
          if (!assignmentToEdit) return;
          await updateAssignment.mutateAsync({ assignmentId: assignmentToEdit.id, payload });
          setAssignmentToEdit(null);
          showToast({
            title: 'Assignment scope updated',
            description: 'The existing assignment was updated atomically.',
            variant: 'success',
          });
          if (assignmentToEdit.userId === currentUser.id) await refreshAccessAfterSave();
        }}
      />

      <Modal
        open={statusToSet !== null}
        title={statusToSet === 'ACTIVE' ? 'Activate custom role?' : 'Deactivate custom role?'}
        description="Status changes affect effective permissions on subsequent backend authorization checks. Existing assignment records are not removed."
        onOpenChange={(open) => {
          if (!setStatus.isPending && !open) setStatusToSet(null);
        }}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setStatusToSet(null)}
              disabled={setStatus.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={statusToSet === 'INACTIVE' ? 'destructive' : 'primary'}
              loading={setStatus.isPending}
              onClick={() => void confirmStatusChange()}
            >
              {statusToSet === 'ACTIVE' ? 'Activate role' : 'Deactivate role'}
            </Button>
          </>
        }
      >
        <p>
          {statusToSet === 'INACTIVE'
            ? 'Users with this role will no longer receive its permissions while the role is inactive.'
            : 'This role will be available for new assignments again.'}
        </p>
      </Modal>

      <Modal
        open={assignmentToRemove !== null}
        title="Remove role assignment?"
        description="The backend marks this assignment inactive; it does not delete the user or role. Removal of the last Organization Admin is blocked."
        onOpenChange={(open) => {
          if (!removeAssignment.isPending && !open) setAssignmentToRemove(null);
        }}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setAssignmentToRemove(null)}
              disabled={removeAssignment.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={removeAssignment.isPending}
              onClick={() => void confirmAssignmentRemoval()}
            >
              Remove assignment
            </Button>
          </>
        }
      >
        <p>
          Remove {assignmentToRemove?.user?.name ?? 'this user'}&apos;s {role.name} assignment at{' '}
          {assignmentToRemove?.scopeType === 'ORGANIZATION'
            ? 'organization scope'
            : (assignmentToRemove?.departmentName ?? 'department scope')}
          ?
        </p>
      </Modal>
    </div>
  );
}
