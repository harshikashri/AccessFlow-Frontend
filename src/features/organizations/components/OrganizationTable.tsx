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
import type { Organization } from '@/features/organizations/types/organization.types';
import { formatOrganizationDate } from '@/features/organizations/utils/organization.utils';
import { OrganizationStatusBadge } from './OrganizationStatusBadge';

interface OrganizationTableProps {
  items: Organization[];
  isLoading: boolean;
  onClearFilters: () => void;
  hasFilters: boolean;
}

export function OrganizationTable({
  items,
  isLoading,
  onClearFilters,
  hasFilters,
}: OrganizationTableProps) {
  return (
    <Table aria-label="Organizations">
      <TableHead>
        <TableRow>
          <TableHeader scope="col">Organization</TableHeader>
          <TableHeader scope="col">Status</TableHeader>
          <TableHeader scope="col">Created</TableHeader>
          <TableHeader scope="col">Last updated</TableHeader>
          <TableHeader scope="col">
            <span className="organization-table__actions-heading">Actions</span>
          </TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {isLoading ? (
          <TableLoadingState columns={5} rows={5} />
        ) : items.length === 0 ? (
          <TableEmptyState colSpan={5}>
            <div className="organization-table__empty">
              <span>
                {hasFilters ? 'No organizations match these filters.' : 'No organizations yet.'}
              </span>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </TableEmptyState>
        ) : (
          items.map((organization) => (
            <TableRow key={organization.id}>
              <TableCell>
                <div className="organization-table__identity">
                  <Link
                    className="organization-table__name"
                    to={`/organizations/${organization.id}`}
                  >
                    {organization.name}
                  </Link>
                  <span className="organization-table__id" title={organization.id}>
                    ID: {organization.id}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <OrganizationStatusBadge status={organization.status} />
              </TableCell>
              <TableCell>{formatOrganizationDate(organization.createdAt)}</TableCell>
              <TableCell>{formatOrganizationDate(organization.updatedAt)}</TableCell>
              <TableCell>
                <Link className="organization-table__view" to={`/organizations/${organization.id}`}>
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
