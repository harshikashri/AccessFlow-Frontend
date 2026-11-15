import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { useRequestTypes } from '@/features/requests/hooks/useRequests';
import { useRoleList } from '@/features/roles/hooks/useRoles';
import { APP_ROUTES } from '@/routes/route.constants';
import { WorkflowForm } from '../components/WorkflowForm';
import { useCreateWorkflow } from '../hooks/useWorkflows';
import type { WorkflowInput } from '../types/workflow.types';

export function WorkflowCreatePage() {
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const allowed = Boolean(
    user &&
    authorizationStatus === 'available' &&
    organizationId &&
    hasPermission(user.authorization, 'workflows.manage', 'organization'),
  );
  const typesQuery = useRequestTypes(user?.id ?? '', organizationId, allowed);
  const rolesQuery = useRoleList(
    user?.id ?? '',
    organizationId,
    { page: 1, limit: 100, search: '', status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' },
    allowed,
  );
  const mutation = useCreateWorkflow(user?.id ?? '', organizationId);

  if (!allowed) return <Navigate to={APP_ROUTES.forbidden} replace />;

  async function submit(payload: WorkflowInput) {
    setError(null);
    try {
      const workflow = await mutation.mutateAsync(payload);
      navigate(`${APP_ROUTES.workflows}/${workflow.id}`, { replace: true });
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, 'The workflow could not be created.'));
    }
  }

  return (
    <div className="workspace-page workflow-page">
      <PageHeader
        eyebrow="Workflows"
        title="Create workflow"
        description="Configure a request-type workflow or the organization fallback."
        actions={
          <Button variant="outline" onClick={() => navigate(APP_ROUTES.workflows)}>
            Back to workflows
          </Button>
        }
      />
      {typesQuery.isError || rolesQuery.isError ? (
        <ErrorState
          title="Workflow setup data unavailable"
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
      ) : typesQuery.isPending || rolesQuery.isPending ? (
        <p>Loading request types and approval roles…</p>
      ) : (
        <WorkflowForm
          requestTypes={typesQuery.data?.items ?? []}
          roles={rolesQuery.data?.items ?? []}
          isSubmitting={mutation.isPending}
          error={error}
          allowDefaultWorkflow
          allowWorkflowTypeSelection
          onCancel={() => navigate(APP_ROUTES.workflows)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
