import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { useRequestTypes } from '@/features/requests/hooks/useRequests';
import { APP_ROUTES } from '@/routes/route.constants';
import { useSetWorkflowStatus, useWorkflowDetails } from '../hooks/useWorkflows';
import { WorkflowStageList } from '../components/WorkflowStageList';
import { WorkflowStatusBadge } from '../components/WorkflowStatusBadge';
import { formatWorkflowCondition } from '../components/workflow-form.utils';

export function WorkflowDetailsPage() {
  const { user, authorizationStatus } = useAuth();
  const { workflowId = '' } = useParams();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const canView = Boolean(
    user && hasPermission(user.authorization, 'workflows.view', 'organization'),
  );
  const canManage = Boolean(
    user && hasPermission(user.authorization, 'workflows.manage', 'organization'),
  );
  const query = useWorkflowDetails(user?.id ?? '', organizationId, workflowId, canView);
  const typesQuery = useRequestTypes(user?.id ?? '', organizationId, canView);
  const statusMutation = useSetWorkflowStatus(user?.id ?? '', organizationId, workflowId);

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canView
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  if (query.isPending)
    return (
      <div className="workspace-page workflow-page">
        <p>Loading workflow…</p>
      </div>
    );
  if (query.isError || !query.data) {
    return (
      <div className="workspace-page workflow-page">
        <ErrorState
          title="Workflow unavailable"
          description={getAuthErrorMessage(query.error, 'The workflow could not be loaded.')}
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }
  const workflow = query.data;
  const requestType = typesQuery.data?.items.find((type) => type.id === workflow.requestTypeId);

  async function toggleStatus() {
    if (workflow.isActive && workflow.isDefault) return;
    if (
      !window.confirm(
        `Are you sure you want to ${workflow.isActive ? 'deactivate' : 'activate'} this workflow?`,
      )
    )
      return;
    setActionError(null);
    try {
      await statusMutation.mutateAsync(!workflow.isActive);
      await query.refetch();
    } catch (error) {
      setActionError(getAuthErrorMessage(error, 'The workflow status could not be changed.'));
    }
  }

  return (
    <div className="workspace-page workflow-page">
      <nav className="workflow-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.workflows}>Workflows</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{workflow.name}</span>
      </nav>
      <PageHeader
        eyebrow="Workflow details"
        title={workflow.name}
        description={workflow.description || 'Approval policy details and stage sequence.'}
        actions={
          <div className="workflow-page__actions">
            {canManage && (
              <Button
                variant="outline"
                onClick={() => navigate(`${APP_ROUTES.workflows}/${workflow.id}/edit`)}
              >
                Edit
              </Button>
            )}
            {canManage && !workflow.isDefault && (
              <Button
                variant="outline"
                onClick={() => void toggleStatus()}
                loading={statusMutation.isPending}
              >
                {workflow.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(APP_ROUTES.workflows)}>
              Back
            </Button>
          </div>
        }
      />
      {actionError && (
        <Alert variant="error" title="Workflow action failed">
          {actionError}
        </Alert>
      )}
      <div className="workflow-detail-grid">
        <Card title="Overview">
          <dl className="workflow-details">
            <div>
              <dt>Request type</dt>
              <dd>
                {requestType?.name ?? (workflow.isDefault ? 'Organization default' : 'Unavailable')}
              </dd>
            </div>
            <div>
              <dt>Workflow selection</dt>
              <dd>
                {workflow.isDefault
                  ? 'Fallback when no conditional workflow matches'
                  : workflow.selectionCondition
                    ? formatWorkflowCondition(
                        workflow.selectionCondition,
                        requestType?.fields ?? [],
                      )
                    : 'Applies to all requests of this type'}
              </dd>
            </div>
            {!workflow.isDefault && (
              <div>
                <dt>Priority</dt>
                <dd>{workflow.priority}</dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>
                <WorkflowStatusBadge workflow={workflow} />
              </dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{workflow.version}</dd>
            </div>
            <div>
              <dt>Approval stages</dt>
              <dd>{workflow.stages.length}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{new Date(workflow.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </Card>
        <Card
          title="Approval sequence"
          description="The runtime evaluates these stages in order and applies conditions on submitted request data."
        >
          <WorkflowStageList stages={workflow.stages} requestFields={requestType?.fields ?? []} />
        </Card>
      </div>
    </div>
  );
}
