import { Button, Input, Select } from '@/components/ui';
import type { RoleListParams } from '@/features/roles/types/role.types';

type RoleSortField = RoleListParams['sortBy'];
type RoleSortOrder = RoleListParams['sortOrder'];
type RoleFilterStatus = NonNullable<RoleListParams['status']> | '';

interface RoleFiltersProps {
  search: string;
  status: RoleFilterStatus;
  sortBy: RoleSortField;
  sortOrder: RoleSortOrder;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: RoleFilterStatus) => void;
  onSortByChange: (value: RoleSortField) => void;
  onSortOrderChange: (value: RoleSortOrder) => void;
  onClear: () => void;
}

export function RoleFilters({
  search,
  status,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onSortByChange,
  onSortOrderChange,
  onClear,
}: RoleFiltersProps) {
  const hasFilters = Boolean(search.trim() || status);

  return (
    <div className="role-filters" aria-label="Role filters">
      <Input
        label="Search roles"
        name="search"
        type="search"
        placeholder="Search role names"
        value={search}
        maxLength={100}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <Select
        label="Status"
        name="status"
        value={status}
        placeholder="All statuses"
        onChange={(event) => onStatusChange(event.target.value as RoleFilterStatus)}
        options={[
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ]}
      />
      <Select
        label="Sort by"
        name="sortBy"
        value={sortBy}
        onChange={(event) => onSortByChange(event.target.value as RoleSortField)}
        options={[
          { value: 'name', label: 'Name' },
          { value: 'roleType', label: 'Role type' },
          { value: 'status', label: 'Status' },
          { value: 'createdAt', label: 'Date created' },
          { value: 'updatedAt', label: 'Last updated' },
        ]}
      />
      <Select
        label="Sort order"
        name="sortOrder"
        value={sortOrder}
        onChange={(event) => onSortOrderChange(event.target.value as RoleSortOrder)}
        options={[
          { value: 'desc', label: 'Descending' },
          { value: 'asc', label: 'Ascending' },
        ]}
      />
      {hasFilters && (
        <Button className="role-filters__clear" variant="ghost" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
