import { Badge } from '@/components/ui';
import type { RoleStatus } from '@/features/roles/types/role.types';

export function RoleStatusBadge({ status }: { status: RoleStatus }) {
  return <Badge variant={status === 'ACTIVE' ? 'success' : 'warning'}>{status}</Badge>;
}
