import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Select } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { useUserDepartmentOptions } from '@/features/users/hooks/useUsers';
import type { UserRoleAssignment, UserScopeType } from '@/features/users/types/user.types';
import type { ManagedRole } from '@/features/roles/types/role.types';

interface RoleAssignmentScopeDialogProps {
  open: boolean;
  role: ManagedRole;
  assignment: UserRoleAssignment | null;
  actorId: string;
  organizationId: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (payload: { scopeType: UserScopeType; departmentId?: string }) => Promise<void>;
}

export function RoleAssignmentScopeDialog({
  open,
  role,
  assignment,
  actorId,
  organizationId,
  isSaving,
  onOpenChange,
  onUpdate,
}: RoleAssignmentScopeDialogProps) {
  const [scopeType, setScopeType] = useState<UserScopeType>('ORGANIZATION');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const departmentsQuery = useUserDepartmentOptions(
    actorId,
    organizationId,
    open && scopeType === 'DEPARTMENT',
    'ACTIVE',
  );
  const scopeOptions =
    role.roleType === 'ORGANIZATION_ADMIN'
      ? [{ value: 'ORGANIZATION', label: 'Organization' }]
      : role.roleType === 'DEPARTMENT_MANAGER'
        ? [{ value: 'DEPARTMENT', label: 'Department' }]
        : [
            { value: 'ORGANIZATION', label: 'Organization' },
            { value: 'DEPARTMENT', label: 'Department' },
          ];

  useEffect(() => {
    if (!open || !assignment) return;
    setScopeType(assignment.scopeType);
    setDepartmentId(assignment.departmentId ?? '');
    setError(null);
  }, [assignment, open]);

  async function submit() {
    if (!assignment || isSaving || (scopeType === 'DEPARTMENT' && !departmentId)) return;
    setError(null);
    try {
      await onUpdate({
        scopeType,
        ...(scopeType === 'DEPARTMENT' ? { departmentId } : {}),
      });
      onOpenChange(false);
    } catch (updateError) {
      setError(getAuthErrorMessage(updateError, 'The assignment scope could not be updated.'));
    }
  }

  return (
    <Modal
      open={open}
      title="Change assignment scope"
      description="The backend validates the new scope and updates this assignment atomically."
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            loading={isSaving}
            disabled={
              isSaving ||
              !assignment ||
              (scopeType === 'DEPARTMENT' && (!departmentId || departmentsQuery.isError))
            }
            onClick={() => void submit()}
          >
            Save scope
          </Button>
        </>
      }
    >
      {error && (
        <Alert variant="error" title="Scope was not changed">
          {error}
        </Alert>
      )}
      <Select
        label="Assignment scope"
        name="scopeType"
        value={scopeType}
        disabled={isSaving || scopeOptions.length === 1}
        onChange={(event) => {
          setScopeType(event.target.value as UserScopeType);
          setDepartmentId('');
        }}
        options={scopeOptions}
      />
      {scopeType === 'DEPARTMENT' &&
        (departmentsQuery.isError ? (
          <Alert variant="error" title="Departments could not be loaded">
            {getAuthErrorMessage(departmentsQuery.error, 'Active department options are required.')}
          </Alert>
        ) : (
          <Select
            label="Department"
            name="departmentId"
            value={departmentId}
            placeholder="Select an active department"
            disabled={isSaving || departmentsQuery.isPending}
            onChange={(event) => setDepartmentId(event.target.value)}
            options={(departmentsQuery.data ?? []).map((department) => ({
              value: department.id,
              label: department.name,
            }))}
          />
        ))}
    </Modal>
  );
}
