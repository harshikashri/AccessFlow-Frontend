import {
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import type {
  ActivityAnalytics,
  ActivityPagination,
  PlatformActivityItem,
  TenantActivityItem,
} from '@/features/dashboard/types/dashboard.types';

interface RecentActivityProps {
  title: string;
  data: ActivityAnalytics;
  page: number;
  onPageChange: (page: number) => void;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function TenantActivity({ items }: { items: TenantActivityItem[] }) {
  return (
    <Table aria-label="Recent tenant activity">
      <TableHead>
        <TableRow>
          <TableHeader>Activity</TableHeader>
          <TableHeader>Actor</TableHeader>
          <TableHeader>Request</TableHeader>
          <TableHeader>Time</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.length === 0 ? (
          <TableEmptyState colSpan={4}>No activity is available for this range.</TableEmptyState>
        ) : (
          items.map((item) => (
            <TableRow key={item.activityId}>
              <TableCell>{item.actionLabel}</TableCell>
              <TableCell>{item.actorName || 'Unknown actor'}</TableCell>
              <TableCell>{item.requestNumber ?? item.requestType ?? '—'}</TableCell>
              <TableCell>{formatTimestamp(item.timestamp)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function PlatformActivity({ items }: { items: PlatformActivityItem[] }) {
  return (
    <Table aria-label="Recent platform activity">
      <TableHead>
        <TableRow>
          <TableHeader>Activity</TableHeader>
          <TableHeader>Actor</TableHeader>
          <TableHeader>Organization</TableHeader>
          <TableHeader>Time</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.length === 0 ? (
          <TableEmptyState colSpan={4}>No activity is available for this range.</TableEmptyState>
        ) : (
          items.map((item) => (
            <TableRow key={item.activityId}>
              <TableCell>{item.action.replace(/_/g, ' ')}</TableCell>
              <TableCell>{item.actor.name || 'Unknown actor'}</TableCell>
              <TableCell>{item.organization.name || 'Unknown organization'}</TableCell>
              <TableCell>{formatTimestamp(item.timestamp)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function ActivityPaginationControls({
  pagination,
  page,
  onPageChange,
}: {
  pagination: ActivityPagination;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="dashboard-pagination" aria-label="Activity pagination">
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {pagination.totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= pagination.totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

export function RecentActivity({ title, data, page, onPageChange }: RecentActivityProps) {
  return (
    <Card title={title} className="dashboard-widget dashboard-widget--wide">
      {data.scope === 'PLATFORM' ? (
        <PlatformActivity items={data.items} />
      ) : (
        <TenantActivity items={data.items} />
      )}
      <ActivityPaginationControls
        pagination={data.pagination}
        page={page}
        onPageChange={onPageChange}
      />
    </Card>
  );
}
