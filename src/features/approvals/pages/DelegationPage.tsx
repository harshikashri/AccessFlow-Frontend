import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { APP_ROUTES } from '@/routes/route.constants';
import { useCreateDelegation, useDelegations, useRevokeDelegation } from '../hooks/useApprovals';

export function DelegationPage() {
  const { user, authorizationStatus } = useAuth();
  const [delegateId, setDelegateId] = useState('');
  const [scopeType, setScopeType] = useState<'ORGANIZATION' | 'DEPARTMENT'>('ORGANIZATION');
  const [departmentId, setDepartmentId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const canApprove = Boolean(
    user && hasPermission(user.authorization, 'requests.approve', 'organization-or-department'),
  );
  const delegations = useDelegations(user?.id ?? '', organizationId, canApprove);
  const create = useCreateDelegation(user?.id ?? '', organizationId);
  const revoke = useRevokeDelegation(user?.id ?? '', organizationId);

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canApprove
  )
    return <Navigate to={APP_ROUTES.forbidden} replace />;

  async function createDelegation() {
    setError(null);
    try {
      await create.mutateAsync({
        delegateId,
        scopeType,
        departmentId: scopeType === 'DEPARTMENT' ? departmentId : null,
        stageIds: [],
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      setDelegateId('');
    } catch (actionError) {
      setError(getAuthErrorMessage(actionError, 'The delegation could not be created.'));
    }
  }

  return (
    <div className="workspace-page approval-page">
      <PageHeader
        eyebrow="Approval management"
        title="Delegation"
        description="Temporarily delegate approval responsibility while preserving backend eligibility and scope checks."
      />
      {error && (
        <Alert variant="error" title="Delegation action failed">
          {error}
        </Alert>
      )}
      <Card
        title="Create delegation"
        description="The delegate must be an active eligible approver. Use the user ID from the organization directory."
      >
        <div className="approval-delegation-form">
          <Input
            label="Delegate user ID"
            name="delegateId"
            value={delegateId}
            onChange={(event) => setDelegateId(event.target.value)}
          />
          <Select
            label="Scope"
            name="scopeType"
            value={scopeType}
            onChange={(event) => setScopeType(event.target.value as typeof scopeType)}
            options={[
              { value: 'ORGANIZATION', label: 'Entire organization' },
              { value: 'DEPARTMENT', label: 'One department' },
            ]}
          />
          {scopeType === 'DEPARTMENT' && (
            <Input
              label="Department ID"
              name="departmentId"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            />
          )}
          <Input
            label="Starts"
            name="startsAt"
            type="text"
            placeholder="2026-11-14T09:00:00Z"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <Input
            label="Ends"
            name="endsAt"
            type="text"
            placeholder="2026-11-15T09:00:00Z"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </div>
        <Button
          disabled={
            !delegateId || !startsAt || !endsAt || (scopeType === 'DEPARTMENT' && !departmentId)
          }
          loading={create.isPending}
          onClick={() => void createDelegation()}
        >
          Create delegation
        </Button>
      </Card>
      <Card title="My delegations">
        {delegations.isError ? (
          <p>{getAuthErrorMessage(delegations.error, 'Delegations could not be loaded.')}</p>
        ) : delegations.data?.items.length ? (
          <div className="approval-delegation-list">
            {delegations.data.items.map((delegation) => (
              <div className="approval-delegation-item" key={delegation.id}>
                <div>
                  <strong>{delegation.delegateId}</strong>
                  <span>
                    {delegation.scopeType} · {new Date(delegation.startsAt).toLocaleString()} –{' '}
                    {new Date(delegation.endsAt).toLocaleString()}
                  </span>
                </div>
                {delegation.status === 'ACTIVE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={revoke.isPending}
                    onClick={() => void revoke.mutateAsync(delegation.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No delegations configured.</p>
        )}
      </Card>
    </div>
  );
}
