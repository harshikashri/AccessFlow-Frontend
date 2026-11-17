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
import { RequestStatusBadge } from './RequestStatusBadge';
import type { RequestSummary } from '../types/request.types';
import { APP_ROUTES } from '@/routes/route.constants';

interface Props {
  items: RequestSummary[];
  isLoading: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function RequestTable({ items, isLoading, hasFilters, onClearFilters }: Props) {
  if (isLoading) return <TableLoadingState columns={6} rows={6} />;
  if (!items.length) {
    return (
      <Table>
        <TableBody>
          <TableEmptyState colSpan={6}>
            <strong>{hasFilters ? 'No matching requests' : 'No requests yet'}</strong>
            <p>
              {hasFilters
                ? 'Try adjusting your filters.'
                : 'Create a request to begin its approval journey.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={onClearFilters}>
                Clear filters
              </button>
            )}
          </TableEmptyState>
        </TableBody>
      </Table>
    );
  }
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader scope="col">Request</TableHeader>
          <TableHeader scope="col">Type</TableHeader>
          <TableHeader scope="col">Requester</TableHeader>
          <TableHeader scope="col">Department</TableHeader>
          <TableHeader scope="col">Status</TableHeader>
          <TableHeader scope="col">Updated</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Link to={`${APP_ROUTES.requests}/${item.id}`} className="request-table__link">
                <strong>{item.requestNumber}</strong>
                <span>{item.title}</span>
              </Link>
            </TableCell>
            <TableCell>{item.requestTypeName || item.requestType}</TableCell>
            <TableCell>{item.requester?.name || 'You'}</TableCell>
            <TableCell>{item.department?.name || '—'}</TableCell>
            <TableCell>
              <RequestStatusBadge status={item.status} />
            </TableCell>
            <TableCell>{new Date(item.updatedAt).toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
