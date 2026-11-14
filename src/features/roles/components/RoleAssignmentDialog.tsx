import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Modal, Select } from '@/components/ui';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import {
  useUserDepartmentOptions,
  useUserList,
  useUserRoleAssignments,
} from '@/features/users/hooks/useUsers';
import type {
  UserListParams,
  UserProfile,
  UserRoleAssignmentRequest,
  UserScopeType,
} from '@/features/users/types/user.types';
import { canAssignRoleAtScope, isDuplicateRoleAssignment } from '@/features/users/utils/user.utils';
import type { ManagedRole } from '@/features/roles/types/role.types';

const pageSize = 10;

interface RoleAssignmentDialogProps {
  open: boolean;
  role: ManagedRole;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (payload: UserRoleAssignmentRequest) => Promise<void>;
}

function getDefaultScope(role: ManagedRole): UserScopeType {
  if (role.roleType === 'ORGANIZATION_ADMIN') return 'ORGANIZATION';
  if (role.roleType === 'DEPARTMENT_MANAGER') return 'DEPARTMENT';
  return 'ORGANIZATION';
}

export function RoleAssignmentDialog({
  open,
  role,
  isSaving,
  onOpenChange,
  onAssign,
}: RoleAssignmentDialogProps) {
  const { user } = useAuth();
  const actorId = user?.id ?? '';
  const organizationId = user?.organizationId ?? '';
  const canViewUsers = Boolean(
    user && hasPermission(user.authorization, 'users.view', 'organization-or-department'),
  );
  const canViewDepartments = Boolean(
    user && hasPermission(user.authorization, 'departments.view', 'organization-or-department'),
  );
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [scopeType, setScopeType] = useState<UserScopeType>(() => getDefaultScope(role));
  const [departmentId, setDepartmentId] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!open) return;
    setSearchInput('');
    setSearch('');
    setSelectedUser(null);
    setDepartmentId('');
    setScopeType(getDefaultScope(role));
    setSaveError(null);
  }, [open, role]);

  const userParams = useMemo<UserListParams>(
    () => ({
      page: 1,
      limit: pageSize,
      search,
      status: 'ACTIVE',
      sortBy: 'name',
      sortOrder: 'asc',
    }),
    [search],
  );
  const usersQuery = useUserList(
    canViewUsers ? actorId : '',
    canViewUsers ? organizationId : '',
    userParams,
    open && canViewUsers && search.length >= 2,
  );
  const assignmentsQuery = useUserRoleAssignments(
    selectedUser ? actorId : '',
    selectedUser ? organizationId : '',
    selectedUser?.id ?? '',
    open && Boolean(selectedUser),
  );
  const departmentsQuery = useUserDepartmentOptions(
    canViewDepartments ? actorId : '',
    canViewDepartments ? organizationId : '',
    open && scopeType === 'DEPARTMENT' && canViewDepartments,
    'ACTIVE',
  );

  const candidateUsers = (usersQuery.data?.users ?? []).filter(
    (candidate) => candidate.accountStatus === 'ACTIVE' && candidate.membership.status === 'ACTIVE',
  );
  const activeDepartments = (departmentsQuery.data ?? []).filter(
    (department) => department.status === 'ACTIVE',
  );
  const selectedDepartmentId = scopeType === 'DEPARTMENT' ? departmentId : null;
  const existingAssignments = assignmentsQuery.data ?? [];
  const isDuplicate =
    selectedUser !== null &&
    isDuplicateRoleAssignment(existingAssignments, {
      roleId: role.id,
      scopeType,
      departmentId: selectedDepartmentId,
    });
  const canAssign = Boolean(
    user &&
    selectedUser &&
    role.status === 'ACTIVE' &&
    canAssignRoleAtScope(user, role, scopeType, selectedDepartmentId),
  );
  const scopeOptions =
    role.roleType === 'ORGANIZATION_ADMIN'
      ? [{ value: 'ORGANIZATION', label: 'Organization' }]
      : role.roleType === 'DEPARTMENT_MANAGER'
        ? [{ value: 'DEPARTMENT', label: 'Department' }]
        : [
            { value: 'ORGANIZATION', label: 'Organization' },
            { value: 'DEPARTMENT', label: 'Department' },
          ];

  async function submitAssignment() {
    if (!selectedUser || !canAssign || isSaving || isDuplicate) return;
    setSaveError(null);
    try {
      await onAssign({
        userId: selectedUser.id,
        scopeType,
        ...(scopeType === 'DEPARTMENT' && departmentId ? { departmentId } : {}),
      });
      onOpenChange(false);
    } catch (error) {
      setSaveError(getAuthErrorMessage(error, 'The role could not be assigned at this scope.'));
    }
  }

  return (
    <Modal
      open={open}
      title={`Assign ${role.name}`}
      description="The backend validates active membership, organization scope, role compatibility, and your permission scope."
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            loading={isSaving}
            disabled={
              isSaving ||
              !canAssign ||
              isDuplicate ||
              assignmentsQuery.isPending ||
              assignmentsQuery.isError ||
              (scopeType === 'DEPARTMENT' && !canViewDepartments) ||
              (scopeType === 'DEPARTMENT' &&
                (!departmentId || departmentsQuery.isError || departmentsQuery.isPending))
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
      {!canViewUsers ? (
        <Alert variant="warning" title="User search is not available">
          Searching for role-assignment targets requires the existing users.view permission. No
          assignment has been submitted.
        </Alert>
      ) : (
        <div className="role-assignment-form">
          <Input
            label="Find a user"
            name="userSearch"
            type="search"
            placeholder="Search by name or email"
            value={searchInput}
            maxLength={100}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setSelectedUser(null);
              setDepartmentId('');
            }}
            helperText="Enter at least two characters. Only active accounts with active organization membership can be assigned."
          />
          {search.length < 2 ? (
            <p className="role-assignment-form__hint">Search results will appear here.</p>
          ) : usersQuery.isError ? (
            <Alert variant="error" title="Users could not be searched">
              {getAuthErrorMessage(usersQuery.error, 'The user directory is unavailable.')}
              <Button variant="outline" size="sm" onClick={() => void usersQuery.refetch()}>
                Retry
              </Button>
            </Alert>
          ) : usersQuery.isPending ? (
            <p className="role-assignment-form__hint" role="status">
              Searching users…
            </p>
          ) : candidateUsers.length === 0 ? (
            <p className="role-assignment-form__hint">
              No active organization members match this search.
            </p>
          ) : (
            <ul className="role-assignment-candidates" aria-label="User search results">
              {candidateUsers.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    className="role-assignment-candidate"
                    type="button"
                    aria-pressed={selectedUser?.id === candidate.id}
                    onClick={() => {
                      setSelectedUser(candidate);
                      setSaveError(null);
                    }}
                  >
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{candidate.email}</small>
                    </span>
                    {selectedUser?.id === candidate.id && <span>Selected</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="role-assignment-form__scope">
        <Select
          label="Assignment scope"
          name="scopeType"
          value={scopeType}
          disabled={isSaving || scopeOptions.length === 1}
          onChange={(event) => {
            setScopeType(event.target.value as UserScopeType);
            setDepartmentId('');
          }}
          options={scopeOptions}
          helperText={
            role.roleType === 'ORGANIZATION_ADMIN'
              ? 'Organization Admin assignments are organization-wide.'
              : role.roleType === 'DEPARTMENT_MANAGER'
                ? 'Department Manager assignments require a department scope.'
                : 'The role is attached to the selected scope, not to the role definition.'
          }
        />
        {scopeType === 'DEPARTMENT' &&
          (canViewDepartments ? (
            <>
              {departmentsQuery.isError && (
                <Alert variant="error" title="Departments could not be loaded">
                  {getAuthErrorMessage(
                    departmentsQuery.error,
                    'Active department options are required for a department-scoped assignment.',
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void departmentsQuery.refetch()}
                  >
                    Retry
                  </Button>
                </Alert>
              )}
              <Select
                label="Department"
                name="departmentId"
                value={departmentId}
                placeholder="Select an active department"
                disabled={isSaving || departmentsQuery.isPending || departmentsQuery.isError}
                onChange={(event) => setDepartmentId(event.target.value)}
                options={activeDepartments.map((department) => ({
                  value: department.id,
                  label: department.name,
                }))}
              />
            </>
          ) : (
            <Alert variant="warning" title="Department options are not available">
              Department-scoped assignments require the existing departments.view permission to
              choose an active department.
            </Alert>
          ))}
      </div>

      {selectedUser && assignmentsQuery.isError && (
        <Alert variant="error" title="Existing assignments could not be checked">
          {getAuthErrorMessage(
            assignmentsQuery.error,
            'Retry before assigning to avoid a duplicate role assignment.',
          )}
          <Button variant="outline" size="sm" onClick={() => void assignmentsQuery.refetch()}>
            Retry
          </Button>
        </Alert>
      )}
      {selectedUser && assignmentsQuery.isPending && (
        <p className="role-assignment-form__hint" role="status">
          Checking this user&apos;s existing role assignments…
        </p>
      )}
      {selectedUser && !assignmentsQuery.isPending && !assignmentsQuery.isError && isDuplicate && (
        <Alert variant="warning" title="This assignment already exists">
          This user already has this role at the selected scope.
        </Alert>
      )}
      {selectedUser && !isDuplicate && !canAssign && role.status === 'ACTIVE' && (
        <Alert variant="warning" title="This scope is outside your effective permissions">
          The backend will not allow an assignment that grants permissions beyond your current
          organization or department scope.
        </Alert>
      )}
      {role.status !== 'ACTIVE' && (
        <Alert variant="warning" title="Inactive roles cannot be assigned">
          Activate this custom role before assigning it. The backend remains authoritative.
        </Alert>
      )}
    </Modal>
  );
}
