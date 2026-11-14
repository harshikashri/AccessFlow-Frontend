import { Link } from 'react-router-dom';
import {
  Button,
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
  onClearFilters: () => void;
  onSetMembershipStatus: (user: UserProfile, status: 'ACTIVE' | 'INACTIVE') => void;
}

export function UserTable({
  users,
  actor,
  isLoading,
  hasFilters,
  canCreate,
  onClearFilters,
  onSetMembershipStatus,
}: UserTableProps) {
  return (
    <Table aria-label="Users">
      <TableHead>
        <TableRow>
          <TableHeader scope="col">User</TableHeader>
          <TableHeader scope="col">Account</TableHeader>
          <TableHeader scope="col">Organization membership</TableHeader>
          <TableHeader scope="col">Department</TableHeader>
          <TableHeader scope="col">Roles</TableHeader>
          <TableHeader scope="col">Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {isLoading ? (
          <TableLoadingState columns={6} rows={5} />
        ) : users.length === 0 ? (
          <TableEmptyState colSpan={6}>
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
                <TableCell>
                  <div className="user-table__identity">
                    {canView ? (
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
                <TableCell>
                  <div className="user-table__actions">
                    {canView && (
                      <Link
                        className="user-table__action-link"
                        to={`${APP_ROUTES.users}/${user.id}`}
                      >
                        View
                      </Link>
                    )}
                    {canEdit && (
                      <Link
                        className="user-table__action-link"
                        to={`${APP_ROUTES.users}/${user.id}/edit`}
                      >
                        Edit
                      </Link>
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
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
