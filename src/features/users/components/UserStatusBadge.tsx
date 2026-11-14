import { Badge } from '@/components/ui';
import type { UserStatus } from '@/features/users/types/user.types';

export function UserAccountStatusBadge({
  status,
  passwordSetupRequired,
}: {
  status: UserStatus;
  passwordSetupRequired?: boolean;
}) {
  if (status === 'INACTIVE' && passwordSetupRequired) {
    return <Badge variant="warning">Setup pending</Badge>;
  }
  return (
    <Badge variant={status === 'ACTIVE' ? 'success' : 'error'}>
      {status === 'ACTIVE' ? 'Account active' : 'Account inactive'}
    </Badge>
  );
}

export function UserMembershipStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'success' : 'warning'}>
      {status === 'ACTIVE' ? 'Membership active' : 'Membership inactive'}
    </Badge>
  );
}
