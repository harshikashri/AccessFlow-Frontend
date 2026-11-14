import { Button, Input, Select } from '@/components/ui';
import type { RequestStatus, RequestType } from '../types/request.types';

interface Props {
  search: string;
  status: RequestStatus | '';
  requestTypeId: string;
  requestTypes: RequestType[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: RequestStatus | '') => void;
  onRequestTypeChange: (value: string) => void;
  onClear: () => void;
}

export function RequestFilters({
  search,
  status,
  requestTypeId,
  requestTypes,
  onSearchChange,
  onStatusChange,
  onRequestTypeChange,
  onClear,
}: Props) {
  const hasFilters = Boolean(search || status || requestTypeId);
  return (
    <div className="request-filters">
      <Input
        label="Search requests"
        type="search"
        name="request-search"
        placeholder="Search request number, title, or requester"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <Select
        label="Status"
        name="request-status"
        value={status}
        onChange={(event) => onStatusChange(event.target.value as RequestStatus | '')}
        options={[
          { value: '', label: 'All statuses' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'SUBMITTED', label: 'Submitted' },
          { value: 'PENDING_APPROVAL', label: 'Pending approval' },
          { value: 'RETURNED', label: 'Returned' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'REJECTED', label: 'Rejected' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ]}
      />
      <Select
        label="Request type"
        name="request-type"
        value={requestTypeId}
        onChange={(event) => onRequestTypeChange(event.target.value)}
        options={[
          { value: '', label: 'All request types' },
          ...requestTypes.map((type) => ({ value: type.id, label: type.name })),
        ]}
      />
      {hasFilters && (
        <Button variant="ghost" className="request-filters__clear" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
