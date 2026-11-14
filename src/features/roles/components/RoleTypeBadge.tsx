import { Badge } from '@/components/ui';
import type { UserRoleType } from '@/features/users/types/user.types';

const roleTypeLabels: Record<UserRoleType, string> = {
  CUSTOM: 'Custom',
  EMPLOYEE: 'Employee',
  DEPARTMENT_MANAGER: 'Department Manager',
  ORGANIZATION_ADMIN: 'Organization Admin',
  FINANCE_APPROVER: 'Finance Approver',
};

export function RoleTypeBadge({ roleType }: { roleType: UserRoleType }) {
  return (
    <Badge variant={roleType === 'CUSTOM' ? 'information' : 'default'}>
      {roleType === 'CUSTOM' ? 'Custom role' : `Built-in · ${roleTypeLabels[roleType]}`}
    </Badge>
  );
}
