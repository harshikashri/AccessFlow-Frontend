import { Alert, Button, Modal } from '@/components/ui';
import type {
  Organization,
  OrganizationStatus,
} from '@/features/organizations/types/organization.types';

interface OrganizationStatusDialogProps {
  organization: Organization;
  nextStatus: OrganizationStatus | null;
  isPending: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function OrganizationStatusDialog({
  organization,
  nextStatus,
  isPending,
  error,
  onOpenChange,
  onConfirm,
}: OrganizationStatusDialogProps) {
  const isDeactivation = nextStatus === 'INACTIVE';
  const action = isDeactivation ? 'deactivate' : 'activate';

  return (
    <Modal
      open={nextStatus !== null}
      title={`${isDeactivation ? 'Deactivate' : 'Activate'} organization?`}
      description={`You are about to ${action} ${organization.name}. Its current status is ${organization.status}.`}
      size="sm"
      onOpenChange={(open) => {
        if (!isPending) onOpenChange(open);
      }}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={isDeactivation ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={isPending}
            disabled={isPending}
          >
            Confirm {action}
          </Button>
        </>
      }
    >
      {error && (
        <Alert variant="error" title="Status update failed">
          {error}
        </Alert>
      )}
      <p className="organization-status-dialog__consequence">
        {isDeactivation
          ? 'Organization members will not be able to sign in while the organization is inactive. Existing organization data is not deleted.'
          : 'Organization members will be able to sign in again after activation.'}
      </p>
    </Modal>
  );
}
