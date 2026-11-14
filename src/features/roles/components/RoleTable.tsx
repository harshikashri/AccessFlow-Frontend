import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableLoadingState,
  TableRow,
} from '@/components/ui';
import { RoleStatusBadge } from '@/features/roles/components/RoleStatusBadge';
import { RoleTypeBadge } from '@/features/roles/components/RoleTypeBadge';
import type { ManagedRole } from '@/features/roles/types/role.types';
import { APP_ROUTES } from '@/routes/route.constants';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
    : '—';
}

interface RoleTableProps {
  roles: ManagedRole[];
  isLoading: boolean;
  canEdit: boolean;
  hasFilters: boolean;
}

export function RoleTable({ roles, isLoading, canEdit, hasFilters }: RoleTableProps) {
  return (
    <Table aria-label="Roles">
      <TableHead>
        <TableRow>
          <TableHeader scope="col">Role</TableHeader>
          <TableHeader scope="col">Type</TableHeader>
          <TableHeader scope="col">Organization</TableHeader>
          <TableHeader scope="col">Permissions</TableHeader>
          <TableHeader scope="col">Active assignments</TableHeader>
          <TableHeader scope="col">Status</TableHeader>
          <TableHeader scope="col">Updated</TableHeader>
          <TableHeader scope="col">Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {isLoading ? (
          <TableLoadingState columns={8} />
        ) : roles.length === 0 ? (
          <TableEmptyState colSpan={8}>
            {hasFilters
              ? 'No roles match these filters.'
              : 'No roles are configured for this organization yet.'}
          </TableEmptyState>
        ) : (
          roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <div className="role-table__identity">
                  <Link className="role-table__name" to={`${APP_ROUTES.roles}/${role.id}`}>
                    {role.name}
                  </Link>
                  {role.description && (
                    <span className="role-table__description">{role.description}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <RoleTypeBadge roleType={role.roleType} />
              </TableCell>
              <TableCell>
                <span className="role-table__organization">Current organization</span>
              </TableCell>
              <TableCell>{role.permissions.length}</TableCell>
              <TableCell>{role.assignmentCount}</TableCell>
              <TableCell>
                <RoleStatusBadge status={role.status} />
              </TableCell>
              <TableCell>{formatDate(role.updatedAt)}</TableCell>
              <TableCell>
                <div className="role-table__actions">
                  <Link className="role-table__action-link" to={`${APP_ROUTES.roles}/${role.id}`}>
                    View
                  </Link>
                  {canEdit && (
                    <Link
                      className="role-table__action-link"
                      to={`${APP_ROUTES.roles}/${role.id}/edit`}
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
