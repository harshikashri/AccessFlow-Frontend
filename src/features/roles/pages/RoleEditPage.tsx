import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Alert, Button, Card } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission } from '@/features/authorization/permissions';
import { PermissionMatrix } from '@/features/roles/components/PermissionMatrix';
import { RoleForm } from '@/features/roles/components/RoleForm';
import {
  usePermissionCatalog,
  useRoleDetails,
  useUpdateRole,
  useUpdateRolePermissions,
} from '@/features/roles/hooks/useRoles';
import type { RoleFormValues, UpdateRoleRequest } from '@/features/roles/types/role.types';
import type { PermissionId } from '@/features/authorization/permission-catalog';
import {
  arePermissionsEqual,
  canEditRolePermissions,
  getRoleSupportedScopes,
  isBuiltInRole,
  isRoleId,
} from '@/features/roles/utils/role.utils';
import { APP_ROUTES } from '@/routes/route.constants';

export function RoleEditPage() {
  const { user, authorizationStatus, refreshCurrentUser } = useAuth();
  const { roleId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionId[]>([]);
  const [permissionsReadyFor, setPermissionsReadyFor] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
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
  const updateRole = useUpdateRole(actorId, organizationId, roleId);
  const updatePermissions = useUpdateRolePermissions(actorId, organizationId, roleId);

  useEffect(() => {
    if (!role) return;
    setSelectedPermissions(role.permissions);
    setPermissionsReadyFor(role.id);
  }, [role]);

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking role edit access" />;
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
  if (!canEdit) {
    return <Navigate to={`${APP_ROUTES.roles}/${roleId}`} replace />;
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
    return <LoadingState label="Loading role for editing" />;
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
            <Button variant="outline" onClick={() => void roleQuery.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const currentRole = role;
  const builtIn = isBuiltInRole(currentRole);
  const editablePermissions = canEditRolePermissions(currentRole);
  const permissionSelectionReady = permissionsReadyFor === currentRole.id;
  const permissionValue = permissionSelectionReady ? selectedPermissions : currentRole.permissions;
  const permissionChangesExist =
    permissionSelectionReady && !arePermissionsEqual(selectedPermissions, currentRole.permissions);

  async function submitRoleDetails(values: RoleFormValues) {
    const payload: UpdateRoleRequest = {};
    if (!builtIn && values.name.trim() !== currentRole.name) payload.name = values.name.trim();
    if (values.description.trim() !== currentRole.description) {
      payload.description = values.description.trim();
    }
    if (!builtIn && values.rolePurpose !== currentRole.rolePurpose) {
      payload.rolePurpose = values.rolePurpose;
    }
    const currentScopes = getRoleSupportedScopes(currentRole);
    if (
      !builtIn &&
      (values.assignmentScopes.length !== currentScopes.length ||
        values.assignmentScopes.some((scope) => !currentScopes.includes(scope)))
    ) {
      payload.assignmentScopes = values.assignmentScopes;
    }
    if (Object.keys(payload).length === 0) {
      showToast({ title: 'No role detail changes', description: 'Nothing needed to be saved.' });
      return;
    }

    try {
      await updateRole.mutateAsync(payload);
      showToast({ title: 'Role details saved', variant: 'success' });
    } catch (error) {
      showToast({
        title: 'Role details were not saved',
        description: getAuthErrorMessage(error, 'The role details could not be updated.'),
        variant: 'error',
      });
    }
  }

  async function savePermissions() {
    if (!permissionChangesExist || updatePermissions.isPending) return;
    setPermissionError(null);
    try {
      await updatePermissions.mutateAsync(selectedPermissions);
      showToast({
        title: 'Permissions saved',
        description: 'Effective permissions are recalculated by the backend.',
        variant: 'success',
      });
      try {
        await refreshCurrentUser();
      } catch (error) {
        showToast({
          title: 'Changes saved; access refresh failed',
          description: getAuthErrorMessage(
            error,
            'Retry refreshing your access before continuing.',
          ),
          variant: 'error',
        });
      }
    } catch (error) {
      setPermissionError(getAuthErrorMessage(error, 'The role permissions could not be updated.'));
    }
  }

  return (
    <div className="workspace-page role-page">
      <nav className="role-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.roles}>Roles and permissions</Link>
        <span aria-hidden="true">/</span>
        <Link to={`${APP_ROUTES.roles}/${role.id}`}>{role.name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Edit</span>
      </nav>
      <PageHeader
        eyebrow={builtIn ? 'Built-in role' : 'Custom role'}
        title={`Edit ${role.name}`}
        description="Role details and permission changes are saved through separate backend operations."
      />
      <Card
        title="Role details"
        description="Only fields allowed by the existing role API are editable."
      >
        <RoleForm
          key={role.id}
          initialValues={{
            name: role.name,
            description: role.description,
            rolePurpose: role.rolePurpose,
            assignmentScopes: getRoleSupportedScopes(role),
          }}
          isBuiltIn={builtIn}
          isLegacyCustomRoleUnconfigured={
            role.roleType === 'CUSTOM' && getRoleSupportedScopes(role).length === 0
          }
          isSaving={updateRole.isPending}
          onCancel={() => navigate(`${APP_ROUTES.roles}/${role.id}`)}
          onSubmit={submitRoleDetails}
        />
      </Card>

      <Card
        title="Role permissions"
        description={
          editablePermissions
            ? 'Changes affect all active assignments for this role on subsequent authorization checks.'
            : 'This built-in role does not allow permission changes through the current backend API.'
        }
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
          <>
            {permissionError && (
              <Alert variant="error" title="Permission changes were not saved">
                {permissionError}
              </Alert>
            )}
            {builtIn && !editablePermissions && (
              <Alert variant="information" title="Permission editing is protected">
                The backend protects this built-in role from permission changes.
              </Alert>
            )}
            {builtIn && editablePermissions && (
              <Alert variant="information" title="Department Manager permissions are configurable">
                Assignments for this built-in role remain department-scoped.
              </Alert>
            )}
            <PermissionMatrix
              modules={permissionQuery.data.modules}
              value={permissionValue}
              {...(editablePermissions ? { onChange: setSelectedPermissions } : {})}
              readOnly={!editablePermissions}
            />
            {editablePermissions && (
              <div className="role-form__actions">
                <Button
                  variant="outline"
                  disabled={!permissionChangesExist || updatePermissions.isPending}
                  onClick={() => setSelectedPermissions(currentRole.permissions)}
                >
                  Discard changes
                </Button>
                <Button
                  loading={updatePermissions.isPending}
                  disabled={!permissionChangesExist || updatePermissions.isPending}
                  onClick={() => void savePermissions()}
                >
                  Save permissions
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
