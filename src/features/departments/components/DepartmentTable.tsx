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
import type { Department } from '@/features/departments/types/department.types';
import { formatDepartmentDate } from '@/features/departments/utils/department.utils';
import { APP_ROUTES } from '@/routes/route.constants';
import { DepartmentStatusBadge } from './DepartmentStatusBadge';

interface DepartmentTableProps {
  items: Department[];
  isLoading: boolean;
  hasFilters: boolean;
  canCreate: boolean;
  onClearFilters: () => void;
}

export function DepartmentTable({
  items,
  isLoading,
  hasFilters,
  canCreate,
  onClearFilters,
}: DepartmentTableProps) {
  return (
    <Table aria-label="Departments">
      <TableHead>
        <TableRow>
          <TableHeader scope="col">Department</TableHeader>
          <TableHeader scope="col">Status</TableHeader>
          <TableHeader scope="col">Managers</TableHeader>
          <TableHeader scope="col">Members</TableHeader>
          <TableHeader scope="col">Created</TableHeader>
          <TableHeader scope="col">Last updated</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {isLoading ? (
          <TableLoadingState columns={6} rows={5} />
        ) : items.length === 0 ? (
          <TableEmptyState colSpan={6}>
            <div className="department-table__empty">
              <span>
                {hasFilters
                  ? 'No departments match these filters.'
                  : 'No departments are available in your authorized scope.'}
              </span>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )}
              {!hasFilters && canCreate && (
                <Link to={`${APP_ROUTES.departments}/new`}>Create the first department</Link>
              )}
            </div>
          </TableEmptyState>
        ) : (
          items.map((department) => (
            <TableRow key={department.id}>
              <TableCell>
                <div className="department-table__identity">
                  <Link
                    className="department-table__name"
                    to={`${APP_ROUTES.departments}/${department.id}`}
                  >
                    {department.name}
                  </Link>
                  {department.description && (
                    <span className="department-table__description">{department.description}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DepartmentStatusBadge status={department.status} />
              </TableCell>
              <TableCell>{department.managerCount}</TableCell>
              <TableCell>{department.memberCount}</TableCell>
              <TableCell>{formatDepartmentDate(department.createdAt)}</TableCell>
              <TableCell>{formatDepartmentDate(department.updatedAt)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
