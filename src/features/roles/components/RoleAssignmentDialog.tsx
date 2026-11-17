import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
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
import { getRoleSupportedScopes } from '@/features/roles/utils/role.utils';
import { APP_ROUTES } from '@/routes/route.constants';
import { useDebounce } from '@/hooks/useDebounce';

const pageSize = 10;

interface RoleAssignmentDialogProps {
  open: boolean;
  role: ManagedRole;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (payload: UserRoleAssignmentRequest) => Promise<void>;
}

function getDefaultScope(role: ManagedRole): UserScopeType | '' {
  const scopes = getRoleSupportedScopes(role);
  return scopes.length === 1 ? (scopes[0] ?? '') : '';
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
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(-1);
  const debouncedSearch = useDebounce(searchInput.trim(), 250);
  const userSearchListId = useId();
  const trimmedSearch = searchInput.trim();
  const search =
    trimmedSearch.length >= 2 && trimmedSearch === debouncedSearch ? debouncedSearch : '';
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [scopeType, setScopeType] = useState<UserScopeType | ''>(() => getDefaultScope(role));
  const [departmentId, setDepartmentId] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const supportedScopes = getRoleSupportedScopes(role);
  const customScopeUnconfigured = role.roleType === 'CUSTOM' && supportedScopes.length === 0;

  useEffect(() => {
    if (!open) return;
    setSearchInput('');
    setSuggestionsOpen(false);
    setActiveCandidateIndex(-1);
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
  const activeCandidate = candidateUsers[activeCandidateIndex];
  const showUserSuggestions =
    suggestionsOpen &&
    search.length >= 2 &&
    !usersQuery.isPending &&
    !usersQuery.isError &&
    candidateUsers.length > 0;
  const activeDepartments = (departmentsQuery.data ?? []).filter(
    (department) => department.status === 'ACTIVE',
  );
  const selectedDepartmentId = scopeType === 'DEPARTMENT' ? departmentId : null;
  const existingAssignments = assignmentsQuery.data ?? [];
  const isDuplicate =
    selectedUser !== null &&
    scopeType !== '' &&
    isDuplicateRoleAssignment(existingAssignments, {
      roleId: role.id,
      scopeType,
      departmentId: selectedDepartmentId,
    });
  const canAssign = Boolean(
    user &&
    selectedUser &&
    scopeType &&
    role.status === 'ACTIVE' &&
    canAssignRoleAtScope(user, role, scopeType, selectedDepartmentId),
  );

  function selectCandidate(candidate: UserProfile) {
    setSelectedUser(candidate);
    setSearchInput(candidate.name);
    setSuggestionsOpen(false);
    setActiveCandidateIndex(-1);
    setSaveError(null);
  }

  function handleUserSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && suggestionsOpen) {
      event.preventDefault();
      event.stopPropagation();
      setSuggestionsOpen(false);
      setActiveCandidateIndex(-1);
      return;
    }
    if (!candidateUsers.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveCandidateIndex((current) => Math.min(current + 1, candidateUsers.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveCandidateIndex((current) =>
        current <= 0 ? candidateUsers.length - 1 : current - 1,
      );
    } else if (event.key === 'Enter' && showUserSuggestions && activeCandidateIndex >= 0) {
      const candidate = candidateUsers[activeCandidateIndex];
      if (candidate) {
        event.preventDefault();
        selectCandidate(candidate);
      }
    }
  }

  async function submitAssignment() {
    const selectedScope = scopeType;
    if (!selectedUser || !selectedScope || !canAssign || isSaving || isDuplicate) return;
    setSaveError(null);
    try {
      await onAssign({
        userId: selectedUser.id,
        scopeType: selectedScope,
        ...(selectedScope === 'DEPARTMENT' && departmentId ? { departmentId } : {}),
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
          <div
            className="role-assignment-form__user-search"
            onBlur={(event) => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                setSuggestionsOpen(false);
                setActiveCandidateIndex(-1);
              }
            }}
          >
            <Input
              label="Find a user"
              name="userSearch"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={showUserSuggestions}
              aria-controls={userSearchListId}
              {...(showUserSuggestions && activeCandidate
                ? {
                    'aria-activedescendant': `${userSearchListId}-option-${activeCandidate.id}`,
                  }
                : {})}
              autoComplete="off"
              placeholder="Search by name or email"
              value={searchInput}
              maxLength={100}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={handleUserSearchKeyDown}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setSelectedUser(null);
                setDepartmentId('');
                setActiveCandidateIndex(-1);
                setSuggestionsOpen(true);
              }}
              helperText="Enter at least two characters. Only active accounts with active organization membership can be assigned."
            />
            {showUserSuggestions && (
              <ul
                id={userSearchListId}
                className="role-assignment-candidates"
                role="listbox"
                aria-label="User search results"
              >
                {candidateUsers.map((candidate, index) => (
                  <li key={candidate.id} role="presentation">
                    <button
                      id={`${userSearchListId}-option-${candidate.id}`}
                      className="role-assignment-candidate"
                      type="button"
                      role="option"
                      aria-selected={selectedUser?.id === candidate.id}
                      onMouseMove={() => setActiveCandidateIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectCandidate(candidate)}
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
          ) : null}
        </div>
      )}

      <div className="role-assignment-form__scope">
        {supportedScopes.length > 1 ? (
          <Select
            label="Assignment scope"
            name="scopeType"
            value={scopeType}
            placeholder="Choose a supported scope"
            disabled={isSaving}
            onChange={(event) => {
              setScopeType(event.target.value as UserScopeType);
              setDepartmentId('');
            }}
            options={supportedScopes.map((scope) => ({
              value: scope,
              label: scope === 'ORGANIZATION' ? 'Organization' : 'Department',
            }))}
            helperText="This role supports both scopes; choose the scope for this user assignment."
          />
        ) : supportedScopes.length === 1 ? (
          <p>
            Assignment scope:{' '}
            {supportedScopes[0] === 'ORGANIZATION' ? 'Organization' : 'Department'}
          </p>
        ) : null}
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

      {customScopeUnconfigured && (
        <Alert variant="warning" title="Assignment scope configuration required">
          This legacy custom role can still be viewed, but it cannot be assigned until an
          administrator edits the role and selects an assignment scope.{' '}
          <Link to={`${APP_ROUTES.roles}/${role.id}/edit`}>Configure role</Link>
        </Alert>
      )}

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
      {selectedUser &&
        !customScopeUnconfigured &&
        !isDuplicate &&
        !canAssign &&
        role.status === 'ACTIVE' && (
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
