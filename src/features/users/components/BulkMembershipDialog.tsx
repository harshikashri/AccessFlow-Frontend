import { useEffect, useState } from 'react';
import { Alert, Button, Modal } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { useBulkMembershipStatus } from '@/features/users/hooks/useUsers';
import type {
  BulkMembershipStatusResult,
  BulkMembershipTargetStatus,
} from '@/features/users/types/bulk-user.types';
import type { UserProfile } from '@/features/users/types/user.types';

interface BulkMembershipDialogProps {
  open: boolean;
  users: UserProfile[];
  status: BulkMembershipTargetStatus;
  actorId: string;
  organizationId: string;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function BulkMembershipDialog({
  open,
  users,
  status,
  actorId,
  organizationId,
  onOpenChange,
  onComplete,
}: BulkMembershipDialogProps) {
  const [result, setResult] = useState<BulkMembershipStatusResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittedUsers, setSubmittedUsers] = useState<UserProfile[]>([]);
  const membershipStatus = useBulkMembershipStatus(actorId, organizationId);

  useEffect(() => {
    if (!open && !membershipStatus.isPending) {
      setResult(null);
      setActionError(null);
      setSubmittedUsers([]);
    }
  }, [membershipStatus.isPending, open]);

  const usersById = new Map(
    (submittedUsers.length > 0 ? submittedUsers : users).map((user) => [user.id, user]),
  );

  async function confirmChange() {
    if (users.length === 0 || membershipStatus.isPending) return;
    setActionError(null);
    setSubmittedUsers(users);
    try {
      const response = await membershipStatus.mutateAsync({
        userIds: users.map((user) => user.id),
        status,
      });
      setResult(response);
      onComplete();
    } catch (error) {
      setActionError(getAuthErrorMessage(error, 'The selected memberships could not be updated.'));
    }
  }

  const close = () => {
    if (!membershipStatus.isPending) onOpenChange(false);
  };
  const isActivating = status === 'ACTIVE';
  const actionVerb = isActivating ? 'reactivated' : 'deactivated';

  return (
    <Modal
      open={open}
      title={
        result
          ? `Bulk ${isActivating ? 'reactivation' : 'deactivation'} results`
          : `${isActivating ? 'Reactivate' : 'Deactivate'} ${users.length} selected users?`
      }
      description={
        result
          ? 'Each selected user is reported separately. Review any blocked or failed memberships.'
          : isActivating
            ? 'This reactivates organization membership only. It does not activate the user’s global account or bypass required password setup.'
            : 'This affects organization membership only; it does not deactivate the user’s global account.'
      }
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
      footer={
        result ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={close} disabled={membershipStatus.isPending}>
              Cancel
            </Button>
            <Button
              variant={isActivating ? 'primary' : 'destructive'}
              onClick={() => void confirmChange()}
              loading={membershipStatus.isPending}
              disabled={users.length === 0}
            >
              {isActivating ? 'Reactivate selected' : 'Deactivate selected'}
            </Button>
          </>
        )
      }
    >
      {actionError && (
        <Alert variant="error" title="Memberships were not updated">
          {actionError}
        </Alert>
      )}
      {result ? (
        <section className="bulk-deactivation-results" aria-live="polite">
          <p>
            {isActivating
              ? `${result.summary.activated} reactivated`
              : `${result.summary.deactivated} deactivated`}
            , {result.results.filter((item) => item.status === 'FAILED').length} failed.
          </p>
          <ul>
            {result.results.map((item, index) => {
              const target = usersById.get(item.userId);
              const label =
                item.status === 'ACTIVATED'
                  ? 'Reactivated'
                  : item.status === 'ALREADY_ACTIVE'
                    ? 'Already active'
                    : item.status === 'DEACTIVATED'
                      ? 'Deactivated'
                      : item.status === 'ALREADY_INACTIVE'
                        ? 'Already inactive'
                        : 'Not updated';
              return (
                <li
                  key={`${item.userId}-${index}`}
                  className={
                    item.status !== 'FAILED'
                      ? 'bulk-deactivation-result--success'
                      : 'bulk-deactivation-result--failure'
                  }
                >
                  <strong>{target?.name ?? 'Selected user'}</strong>
                  <span>
                    {label}: {item.message}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="bulk-deactivation-confirmation">
          <p>
            {users.length} selected organization {users.length === 1 ? 'membership' : 'memberships'}{' '}
            will be {actionVerb}.{' '}
            {isActivating
              ? 'Users with pending password setup must complete setup before they can access the organization.'
              : 'Those users will lose access to this organization, and applicable active sessions will be revoked.'}{' '}
            Historical requests, approvals, role assignments, and audit records are preserved.
          </p>
          {!isActivating && (
            <p>
              Your own membership cannot be selected. Users whose pending workflow responsibilities
              or organization-admin coverage prevent safe deactivation may be reported as
              unsuccessful. Other eligible memberships can still be deactivated.
            </p>
          )}
          <ul className="bulk-deactivation-confirmation__users">
            {users.map((user) => (
              <li key={user.id}>
                {user.name} <span>({user.email})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
