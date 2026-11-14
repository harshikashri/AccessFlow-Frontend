import { Badge } from '@/components/ui';
import type { DepartmentStatus } from '@/features/departments/types/department.types';

export function DepartmentStatusBadge({ status }: { status: DepartmentStatus }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'success' : 'warning'}>
      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
    </Badge>
  );
}
