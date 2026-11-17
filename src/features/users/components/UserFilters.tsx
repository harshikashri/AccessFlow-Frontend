import { Button, Input, Select } from '@/components/ui';
import type {
  UserRoleFilterOption,
  UserSortField,
  UserStatus,
} from '@/features/users/types/user.types';
import type { Department } from '@/features/departments/types/department.types';

interface UserFiltersProps {
  search: string;
  status: UserStatus | '';
  departmentId: string;
  roleId: string;
  sortBy: UserSortField;
  departments: Department[];
  roles: UserRoleFilterOption[];
  departmentsLoading: boolean;
  rolesLoading: boolean;
  departmentFilterError?: string | null;
  roleFilterError?: string | null;
  departmentFilterDisabled?: boolean;
  roleFilterDisabled?: boolean;
  hideDepartmentFilter?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: UserStatus | '') => void;
  onDepartmentChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onSortByChange: (value: UserSortField) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export function UserFilters(props: UserFiltersProps) {
  return (
    <div className="user-filters">
      <Input
        label="Search users"
        name="search"
        type="search"
        placeholder="Search by name or email"
        value={props.search}
        maxLength={100}
        onChange={(event) => props.onSearchChange(event.target.value)}
      />
      <Select
        label="Account status"
        name="status"
        value={props.status}
        placeholder="All account statuses"
        onChange={(event) => props.onStatusChange(event.target.value as UserStatus | '')}
        options={[
          { value: 'ACTIVE', label: 'Active account' },
          { value: 'INACTIVE', label: 'Inactive account' },
        ]}
      />
      {!props.hideDepartmentFilter && (
        <Select
          label="Department"
          name="departmentId"
          value={props.departmentId}
          placeholder="All departments"
          disabled={
            props.departmentFilterDisabled ||
            props.departmentsLoading ||
            Boolean(props.departmentFilterError)
          }
          {...(props.departmentFilterError || props.departmentsLoading
            ? {
                helperText:
                  props.departmentFilterError ??
                  (props.departmentsLoading ? 'Loading departments…' : ''),
              }
            : {})}
          onChange={(event) => props.onDepartmentChange(event.target.value)}
          options={[
            { value: 'null', label: 'Unassigned' },
            ...props.departments.map((department) => ({
              value: department.id,
              label: `${department.name}${department.status === 'INACTIVE' ? ' (inactive)' : ''}`,
            })),
          ]}
        />
      )}
      <Select
        label="Role"
        name="roleId"
        value={props.roleId}
        placeholder="All roles"
        disabled={props.roleFilterDisabled || props.rolesLoading || Boolean(props.roleFilterError)}
        {...(props.roleFilterError || props.rolesLoading
          ? {
              helperText: props.roleFilterError ?? (props.rolesLoading ? 'Loading roles…' : ''),
            }
          : {})}
        onChange={(event) => props.onRoleChange(event.target.value)}
        options={[...props.roles.map((role) => ({ value: role.id, label: role.name }))]}
      />
      <Select
        label="Sort by"
        name="sortBy"
        value={props.sortBy}
        onChange={(event) => props.onSortByChange(event.target.value as UserSortField)}
        options={[
          { value: 'name', label: 'Name' },
          { value: 'email', label: 'Email' },
          { value: 'accountStatus', label: 'Account status' },
          { value: 'createdAt', label: 'Date created' },
          { value: 'updatedAt', label: 'Last updated' },
        ]}
      />
      {props.hasFilters && (
        <Button className="user-filters__clear" variant="ghost" onClick={props.onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
