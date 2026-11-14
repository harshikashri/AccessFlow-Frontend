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
import { RoleStatusBadge } from '@/features/roles/components/RoleStatusBadge';
import type { RoleUserAssignment } from '@/features/roles/types/role.types';
import type { AssignmentPagination } from '@/features/roles/types/role.types';
import { APP_ROUTES } from '@/routes/route.constants';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
    : '—';
}

interface AssignedUsersTableProps {
  assignments: RoleUserAssignment[];
  pagination?: AssignmentPagination;
  isLoading: boolean;
  canManage: boolean;
  canViewProfiles: boolean;
  isRemoving: boolean;
  onRemove: (assignment: RoleUserAssignment) => void;
  onPageChange: (page: number) => void;
}

export function AssignedUsersTable({
  assignments,
  pagination,
  isLoading,
  canManage,
  canViewProfiles,
  isRemoving,
  onRemove,
  onPageChange,
}: AssignedUsersTableProps) {
  return (
    <>
      <Table aria-label="Role assignments">
        <TableHead>
          <TableRow>
            <TableHeader scope="col">User</TableHeader>
            <TableHeader scope="col">Scope</TableHeader>
            <TableHeader scope="col">Assignment status</TableHeader>
            <TableHeader scope="col">Assigned</TableHeader>
            <TableHeader scope="col">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableLoadingState columns={5} />
          ) : assignments.length === 0 ? (
            <TableEmptyState colSpan={5}>
              No assignments are recorded for this role.
            </TableEmptyState>
          ) : (
            assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell>
                  <div className="role-table__identity">
                    {canViewProfiles && assignment.user ? (
                      <Link
                        className="role-table__name"
                        to={`${APP_ROUTES.users}/${assignment.userId}`}
                      >
                        {assignment.user.name}
                      </Link>
                    ) : (
                      <strong>{assignment.user?.name ?? 'User unavailable'}</strong>
                    )}
                    {assignment.user?.email && (
                      <span className="role-table__description">{assignment.user.email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {assignment.scopeType === 'ORGANIZATION'
                    ? 'Organization'
                    : (assignment.departmentName ?? 'Department')}
                </TableCell>
                <TableCell>
                  <RoleStatusBadge status={assignment.status} />
                </TableCell>
                <TableCell>{formatDate(assignment.assignedAt)}</TableCell>
                <TableCell>
                  {canManage && assignment.status === 'ACTIVE' ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={
                        isRemoving ||
                        (assignment.scopeType === 'DEPARTMENT' && !assignment.departmentId)
                      }
                      title={
                        assignment.scopeType === 'DEPARTMENT' && !assignment.departmentId
                          ? 'Cannot remove this assignment because its department is unavailable.'
                          : undefined
                      }
                      onClick={() => onRemove(assignment)}
                    >
                      Remove
                    </Button>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination && pagination.totalPages > 1 && (
        <div className="role-pagination">
          <p>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} assignment
            {pagination.total === 1 ? '' : 's'}
          </p>
          <div className="role-pagination__actions">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
