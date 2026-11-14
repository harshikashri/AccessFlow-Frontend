import { Badge } from '@/components/ui';
import type { RequestStatus } from '../types/request.types';

const labels: Record<RequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PENDING_APPROVAL: 'Pending approval',
  RETURNED: 'Returned',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const variants: Record<RequestStatus, 'default' | 'information' | 'success' | 'warning' | 'error'> =
  {
    DRAFT: 'default',
    SUBMITTED: 'information',
    PENDING_APPROVAL: 'warning',
    RETURNED: 'warning',
    APPROVED: 'success',
    REJECTED: 'error',
    CANCELLED: 'default',
  };

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
