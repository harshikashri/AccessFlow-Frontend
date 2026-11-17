import { Link } from 'react-router-dom';
import { IconLink } from '@/components/common/IconLink';
import {
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableLoadingState,
  TableRow,
} from '@/components/ui';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { APP_ROUTES } from '@/routes/route.constants';
import type { UserProfile } from '@/features/users/types/user.types';
import {
  canEditUserScope,
  canManageUserMembership,
  canViewUserScope,
} from '@/features/users/utils/user.utils';
import { UserAccountStatusBadge, UserMembershipStatusBadge } from './UserStatusBadge';

interface UserTableProps {
  users: UserProfile[];
  actor: AuthenticatedUser;
  isLoading: boolean;
  hasFilters: boolean;
  canCreate: boolean;
  readOnlyDirectory?: boolean;
  onClearFilters: () => void;
  onSetMembershipStatus: (user: UserProfile, status: 'ACTIVE' | 'INACTIVE') => void;
  selection?: {
    selectedIds: ReadonlySet<string>;
    canSelectUser: (user: UserProfile) => boolean;
    onToggle: (userId: string, selected: boolean) => void;
    onSelectPage: (userIds: string[], selected: boolean) => void;
  };
}

export function UserTable({
  users,
  actor,
  isLoading,
  hasFilters,
  canCreate,
  readOnlyDirectory = false,
  onClearFilters,
  onSetMembershipStatus,
  selection,
}: UserTableProps) {
  const selectableUsers = selection ? users.filter(selection.canSelectUser) : [];
  const selectedCount = selectableUsers.filter((user) =>
    selection?.selectedIds.has(user.id),
  ).length;
  const allSelectableSelected =
    selectableUsers.length > 0 && selectedCount === selectableUsers.length;

  return (
    <Table aria-label="Users">
      <TableHead>
        <TableRow>
          {selection && (
            <TableHeader scope="col">
              <Checkbox
                label="All users on this page"
                visuallyHiddenLabel
                checked={allSelectableSelected}
                indeterminate={selectedCount > 0 && !allSelectableSelected}
                disabled={selectableUsers.length === 0 || isLoading}
                onChange={(event) =>
                  selection.onSelectPage(
                    selectableUsers.map((user) => user.id),
                    event.target.checked,
                  )
                }
              />
            </TableHeader>
          )}
          <TableHeader scope="col">User</TableHeader>
          <TableHeader scope="col">Account</TableHeader>
          <TableHeader scope="col">Organization membership</TableHeader>
          <TableHeader scope="col">Department</TableHeader>
          <TableHeader scope="col">Roles</TableHeader>
          {!readOnlyDirectory && <TableHeader scope="col">Actions</TableHeader>}
        </TableRow>
      </TableHead>
      <TableBody>
        {isLoading ? (
          <TableLoadingState
            columns={selection ? (readOnlyDirectory ? 6 : 7) : readOnlyDirectory ? 5 : 6}
            rows={5}
          />
        ) : users.length === 0 ? (
          <TableEmptyState
            colSpan={selection ? (readOnlyDirectory ? 6 : 7) : readOnlyDirectory ? 5 : 6}
          >
            <div className="user-table__empty">
              <span>
                {hasFilters
                  ? 'No users match these filters.'
                  : 'No users are available in your authorized scope.'}
              </span>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )}
              {!hasFilters && canCreate && <Link to={APP_ROUTES.newUser}>Add the first user</Link>}
            </div>
          </TableEmptyState>
        ) : (
          users.map((user) => {
            const departmentId = user.membership.departmentId;
            const canView = canViewUserScope(actor, departmentId);
            const canEdit = canEditUserScope(actor, departmentId);
            const canManageMembership = canManageUserMembership(actor, departmentId);
            return (
              <TableRow key={user.id}>
                {selection && (
                  <TableCell>
                    {selection.canSelectUser(user) ? (
                      <Checkbox
                        label={user.name}
                        visuallyHiddenLabel
                        checked={selection.selectedIds.has(user.id)}
                        onChange={(event) => selection.onToggle(user.id, event.target.checked)}
                      />
                    ) : (
                      <span aria-label={`${user.name} cannot be selected`}>—</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <div className="user-table__identity">
                    {canView && !readOnlyDirectory ? (
                      <Link className="user-table__name" to={`${APP_ROUTES.users}/${user.id}`}>
                        {user.name}
                      </Link>
                    ) : (
                      <span className="user-table__name">{user.name}</span>
                    )}
                    <span className="user-table__email">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <UserAccountStatusBadge
                    status={user.accountStatus}
                    {...(user.passwordSetupRequired === undefined
                      ? {}
                      : { passwordSetupRequired: user.passwordSetupRequired })}
                  />
                </TableCell>
                <TableCell>
                  <UserMembershipStatusBadge status={user.membership.status} />
                </TableCell>
                <TableCell>{user.membership.department?.name ?? 'Unassigned'}</TableCell>
                <TableCell>
                  {user.roleAssignments
                    .filter((assignment) => assignment.status === 'ACTIVE')
                    .map((assignment) => assignment.roleName ?? 'Role')
                    .join(', ') || '—'}
                </TableCell>
                {!readOnlyDirectory && (
                  <TableCell>
                    <div className="user-table__actions">
                      {canView && (
                        <IconLink
                          icon="view"
                          className="user-table__action-link"
                          label={`View ${user.name}`}
                          to={`${APP_ROUTES.users}/${user.id}`}
                        />
                      )}
                      {canEdit && (
                        <IconLink
                          icon="edit"
                          className="user-table__action-link"
                          label={`Edit ${user.name}`}
                          to={`${APP_ROUTES.users}/${user.id}/edit`}
                        />
                      )}
                      {canManageMembership &&
                        user.id !== actor.id &&
                        user.membership.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSetMembershipStatus(user, 'INACTIVE')}
                          >
                            Deactivate membership
                          </Button>
                        )}
                      {canManageMembership &&
                        user.id !== actor.id &&
                        user.membership.status === 'INACTIVE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSetMembershipStatus(user, 'ACTIVE')}
                          >
                            Reactivate membership
                          </Button>
                        )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
