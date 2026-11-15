import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Modal, Select } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type { Department } from '@/features/departments/types/department.types';
import type {
  RemoveUserRoleAssignmentRequest,
  UserRole,
  UserRoleAssignment,
  UserRoleAssignmentRequest,
  UserScopeType,
} from '@/features/users/types/user.types';
import { canAssignRoleAtScope } from '@/features/users/utils/user.utils';
import { getRoleSupportedScopes } from '@/features/roles/utils/role.utils';
import { APP_ROUTES } from '@/routes/route.constants';

interface UserRoleAssignmentsProps {
  actor: AuthenticatedUser;
  roles: UserRole[];
  assignments: UserRoleAssignment[];
  departments: Department[];
  isLoading: boolean;
  loadError: unknown;
  canManage: boolean;
  isSaving: boolean;
  onRetry: () => void;
  onAssign: (roleId: string, payload: Omit<UserRoleAssignmentRequest, 'userId'>) => Promise<void>;
  onRemove: (roleId: string, payload: RemoveUserRoleAssignmentRequest) => Promise<void>;
}

export function UserRoleAssignments({
  actor,
  roles,
  assignments,
  departments,
  isLoading,
  loadError,
  canManage,
  isSaving,
  onRetry,
  onAssign,
  onRemove,
}: UserRoleAssignmentsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleId, setRoleId] = useState('');
  const [scopeType, setScopeType] = useState<UserScopeType | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [assignmentToRemove, setAssignmentToRemove] = useState<UserRoleAssignment | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const selectedRole = roles.find((role) => role.id === roleId);
  const targetDepartmentId = scopeType === 'DEPARTMENT' ? departmentId : null;
  const activeDepartments = departments.filter((department) => department.status === 'ACTIVE');
  const availableRoles = roles.filter((role) =>
    getRoleSupportedScopes(role).some((scope) =>
      scope === 'ORGANIZATION'
        ? canAssignRoleAtScope(actor, role, scope, null)
        : activeDepartments.some((department) =>
            canAssignRoleAtScope(actor, role, scope, department.id),
          ),
    ),
  );
  const unconfiguredCustomRoles = roles.filter(
    (role) => role.roleType === 'CUSTOM' && getRoleSupportedScopes(role).length === 0,
  );
  const selectedRoleScopes = selectedRole ? getRoleSupportedScopes(selectedRole) : [];

  function selectRole(nextRoleId: string) {
    const role = roles.find((item) => item.id === nextRoleId);
    const scopes = role ? getRoleSupportedScopes(role) : [];
    setRoleId(nextRoleId);
    setScopeType(scopes.length === 1 ? (scopes[0] ?? '') : '');
    setDepartmentId('');
  }

  async function submitAssignment() {
    if (!selectedRole || !scopeType || !canManage) return;
    setSaveError(null);
    try {
      await onAssign(selectedRole.id, {
        scopeType,
        ...(scopeType === 'DEPARTMENT' && departmentId ? { departmentId } : {}),
      });
      setDialogOpen(false);
      setRoleId('');
      setScopeType('');
      setDepartmentId('');
    } catch (error) {
      setSaveError(getAuthErrorMessage(error, 'The role could not be assigned at this scope.'));
    }
  }

  async function confirmRemoval() {
    if (!assignmentToRemove || !canManage) return;
    setRemoveError(null);
    try {
      await onRemove(assignmentToRemove.roleId, {
        scopeType: assignmentToRemove.scopeType,
        ...(assignmentToRemove.scopeType === 'DEPARTMENT' && assignmentToRemove.departmentId
          ? { departmentId: assignmentToRemove.departmentId }
          : {}),
      });
      setAssignmentToRemove(null);
    } catch (error) {
      setRemoveError(getAuthErrorMessage(error, 'The role assignment could not be removed.'));
    }
  }

  return (
    <Card
      title="Role assignments"
      description="Role assignments are scoped to this organization and its departments."
      className="user-role-card"
    >
      {loadError ? (
        <Alert variant="error" title="Role assignments are unavailable">
          {getAuthErrorMessage(
            loadError,
            'The role assignment API is unavailable for this account.',
          )}
          <div className="user-role-card__retry">
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : isLoading ? (
        <p>Loading role assignments…</p>
      ) : (
        <>
          {canManage && (
            <div className="user-role-card__actions">
              <Button onClick={() => setDialogOpen(true)}>Assign role</Button>
            </div>
          )}
          {assignments.length === 0 ? (
            <p className="user-form__note">No role assignments are recorded.</p>
          ) : (
            <ul className="user-role-list">
              {assignments.map((assignment) => (
                <li key={assignment.id}>
                  <div className="user-role-list__details">
                    <Link
                      className="user-role-list__role-link"
                      to={`${APP_ROUTES.roles}/${assignment.roleId}`}
                    >
                      {assignment.roleName ?? 'Role'}
                    </Link>
                    <span>
                      {assignment.scopeType === 'ORGANIZATION'
                        ? 'Organization'
                        : (assignment.departmentName ?? 'Department')}
                    </span>
                    <Badge variant={assignment.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {assignment.status === 'ACTIVE' ? 'Assignment active' : 'Assignment inactive'}
                    </Badge>
                  </div>
                  {canManage && assignment.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setRemoveError(null);
                        setAssignmentToRemove(assignment);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Modal
        open={dialogOpen}
        title="Assign a role"
        description="The backend will verify your role, permission scope, and the user's active membership."
        onOpenChange={(open) => {
          if (!isSaving) setDialogOpen(open);
        }}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              loading={isSaving}
              disabled={
                isSaving ||
                !selectedRole ||
                !scopeType ||
                !canAssignRoleAtScope(actor, selectedRole, scopeType, targetDepartmentId) ||
                (scopeType === 'DEPARTMENT' && !departmentId)
              }
              onClick={() => void submitAssignment()}
            >
              Assign role
            </Button>
          </>
        }
      >
        {saveError && (
          <Alert variant="error" title="Role was not assigned">
            {saveError}
          </Alert>
        )}
        {unconfiguredCustomRoles.length > 0 && (
          <Alert variant="warning" title="Some custom roles require configuration">
            These roles remain visible, but cannot be assigned until an assignment scope is
            configured:
            <ul>
              {unconfiguredCustomRoles.map((role) => (
                <li key={role.id}>
                  <Link to={`${APP_ROUTES.roles}/${role.id}/edit`}>{role.name}</Link>
                </li>
              ))}
            </ul>
          </Alert>
        )}
        {roles.length === 0 ? (
          <p>No active roles are available.</p>
        ) : (
          <div className="user-form__fields">
            <Select
              label="Role"
              name="roleId"
              value={roleId}
              placeholder="Select a role"
              onChange={(event) => selectRole(event.target.value)}
              options={[...availableRoles.map((role) => ({ value: role.id, label: role.name }))]}
            />
            {selectedRoleScopes.length > 1 ? (
              <Select
                label="Assignment scope"
                name="scopeType"
                value={scopeType}
                placeholder="Choose a supported scope"
                onChange={(event) => {
                  setScopeType(event.target.value as UserScopeType);
                  setDepartmentId('');
                }}
                options={selectedRoleScopes.map((scope) => ({
                  value: scope,
                  label: scope === 'ORGANIZATION' ? 'Organization' : 'Department',
                }))}
              />
            ) : selectedRoleScopes.length === 1 ? (
              <p className="user-form__note">
                Assignment scope: {selectedRoleScopes[0] === 'ORGANIZATION' ? 'Organization' : 'Department'}
              </p>
            ) : null}
            {scopeType === 'DEPARTMENT' && (
              <Select
                label="Department"
                name="departmentId"
                value={departmentId}
                placeholder="Select a department"
                onChange={(event) => setDepartmentId(event.target.value)}
                options={[
                  ...activeDepartments.map((department) => ({
                    value: department.id,
                    label: department.name,
                  })),
                ]}
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={assignmentToRemove !== null}
        title="Remove role assignment?"
        description="This role assignment will be marked inactive. Removing the last Organization Admin is prevented by the backend."
        onOpenChange={(open) => {
          if (!isSaving && !open) setAssignmentToRemove(null);
        }}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setAssignmentToRemove(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button variant="destructive" loading={isSaving} onClick={() => void confirmRemoval()}>
              Remove assignment
            </Button>
          </>
        }
      >
        {removeError && (
          <Alert variant="error" title="Role assignment was not removed">
            {removeError}
          </Alert>
        )}
        <p>
          Remove {assignmentToRemove?.roleName ?? 'this role'} at{' '}
          {assignmentToRemove?.scopeType === 'ORGANIZATION'
            ? 'organization scope'
            : (assignmentToRemove?.departmentName ?? 'department scope')}
          ?
        </p>
      </Modal>
    </Card>
  );
}
