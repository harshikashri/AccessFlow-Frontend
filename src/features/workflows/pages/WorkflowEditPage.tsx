import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthError, getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { useRequestTypes } from '@/features/requests/hooks/useRequests';
import { useRoleList } from '@/features/roles/hooks/useRoles';
import { APP_ROUTES } from '@/routes/route.constants';
import { WorkflowForm } from '../components/WorkflowForm';
import { useUpdateWorkflow, useWorkflowDetails } from '../hooks/useWorkflows';
import type { WorkflowInput } from '../types/workflow.types';

export function WorkflowEditPage() {
  const { user, authorizationStatus } = useAuth();
  const { workflowId = '' } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const allowed = Boolean(
    user &&
    authorizationStatus === 'available' &&
    organizationId &&
    hasPermission(user.authorization, 'workflows.manage', 'organization'),
  );
  const detailsQuery = useWorkflowDetails(user?.id ?? '', organizationId, workflowId, allowed);
  const typesQuery = useRequestTypes(user?.id ?? '', organizationId, allowed);
  const rolesQuery = useRoleList(
    user?.id ?? '',
    organizationId,
    { page: 1, limit: 100, search: '', status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' },
    allowed,
  );
  const mutation = useUpdateWorkflow(user?.id ?? '', organizationId, workflowId);

  if (!allowed) return <Navigate to={APP_ROUTES.forbidden} replace />;
  if (detailsQuery.isPending)
    return (
      <div className="workspace-page workflow-page">
        <p>Loading workflow…</p>
      </div>
    );
  if (detailsQuery.isError || !detailsQuery.data) {
    return (
      <div className="workspace-page workflow-page">
        <ErrorState
          title="Workflow unavailable"
          description={getAuthErrorMessage(detailsQuery.error, 'The workflow could not be loaded.')}
          action={
            <Button variant="outline" onClick={() => void detailsQuery.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }
  if (typesQuery.isPending || rolesQuery.isPending) {
    return (
      <div className="workspace-page workflow-page">
        <p>Loading request types and approval roles…</p>
      </div>
    );
  }
  if (typesQuery.isError || rolesQuery.isError || !typesQuery.data || !rolesQuery.data) {
    return (
      <div className="workspace-page workflow-page">
        <ErrorState
          title="Workflow editor data unavailable"
          description={getAuthErrorMessage(
            typesQuery.error ?? rolesQuery.error,
            'Request types and approval roles could not be loaded.',
          )}
          action={
            <Button
              variant="outline"
              onClick={() => {
                void typesQuery.refetch();
                void rolesQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const workflow = detailsQuery.data;
  async function submit(payload: WorkflowInput) {
    setError(null);
    try {
      const updated = await mutation.mutateAsync(payload);
      navigate(`${APP_ROUTES.workflows}/${updated.id}`, { replace: true });
    } catch (submitError) {
      const authError = getAuthError(submitError);
      const details =
        Array.isArray(authError.details) && authError.details.length
          ? ` ${authError.details
              .map((detail) => (typeof detail === 'string' ? detail : JSON.stringify(detail)))
              .join(' ')}`
          : '';
      setError(`${authError.message || 'The workflow could not be updated.'}${details}`.trim());
    }
  }

  return (
    <div className="workspace-page workflow-page">
      <PageHeader
        eyebrow="Workflows"
        title={`Edit ${workflow.name}`}
        description="Saving creates a new workflow version so existing requests retain their approval history."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`${APP_ROUTES.workflows}/${workflow.id}`)}
          >
            Cancel
          </Button>
        }
      />
      <WorkflowForm
        initialValues={{
          name: workflow.name,
          description: workflow.description,
          requestTypeId: workflow.requestTypeId ?? '',
          isDefault: workflow.isDefault,
          selectionCondition: workflow.selectionCondition,
          priority: workflow.priority,
          stages: workflow.stages,
        }}
        requestTypes={typesQuery.data.items}
        roles={rolesQuery.data.items}
        isSubmitting={mutation.isPending}
        error={error}
        allowDefaultWorkflow={workflow.isDefault}
        onCancel={() => navigate(`${APP_ROUTES.workflows}/${workflow.id}`)}
        onSubmit={submit}
      />
    </div>
  );
}
