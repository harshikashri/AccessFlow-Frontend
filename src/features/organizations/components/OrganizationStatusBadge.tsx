import { Badge } from '@/components/ui';
import type { OrganizationStatus } from '@/features/organizations/types/organization.types';

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  return <Badge variant={status === 'ACTIVE' ? 'success' : 'warning'}>{status}</Badge>;
}
