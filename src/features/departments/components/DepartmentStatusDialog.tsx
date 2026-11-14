import { Alert, Button, Modal } from '@/components/ui';
import type { Department, DepartmentStatus } from '@/features/departments/types/department.types';

interface DepartmentStatusDialogProps {
  department: Department;
  nextStatus: DepartmentStatus | null;
  isPending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DepartmentStatusDialog({
  department,
  nextStatus,
  isPending,
  error,
  onOpenChange,
  onConfirm,
}: DepartmentStatusDialogProps) {
  const isDeactivation = nextStatus === 'INACTIVE';
  const action = isDeactivation ? 'deactivate' : 'activate';

  return (
    <Modal
      open={nextStatus !== null}
      title={`${isDeactivation ? 'Deactivate' : 'Activate'} department?`}
      description={`You are about to ${action} ${department.name}. Its current status is ${department.status}.`}
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
      <p className="department-dialog__consequence">
        {isDeactivation
          ? 'Existing member and manager assignments are retained. The department becomes unavailable for updates and new member assignments, and department-scoped permissions are no longer effective.'
          : 'The department becomes available again and its existing assignments are retained.'}
      </p>
    </Modal>
  );
}
