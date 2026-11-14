import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input, Modal } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { APP_ROUTES } from '@/routes/route.constants';
import { RequestStatusBadge } from '../components/RequestStatusBadge';
import {
  useCancelRequest,
  useRequestDetails,
  useRequestHistory,
  useRequestProgress,
  useResubmitRequest,
  useSubmitRequest,
} from '../hooks/useRequests';

export function RequestDetailsPage() {
  const { requestId = '' } = useParams();
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const canView = Boolean(
    user && hasPermission(user.authorization, 'requests.view', 'organization-or-department'),
  );
  const detailsQuery = useRequestDetails(user?.id ?? '', organizationId, requestId, canView);
  const progressQuery = useRequestProgress(user?.id ?? '', organizationId, requestId, canView);
  const historyQuery = useRequestHistory(user?.id ?? '', organizationId, requestId, canView);
  const submit = useSubmitRequest(user?.id ?? '', organizationId);
  const resubmit = useResubmitRequest(user?.id ?? '', organizationId);
  const cancel = useCancelRequest(user?.id ?? '', organizationId);

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canView
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  if (detailsQuery.isError) {
    return (
      <div className="workspace-page request-page">
        <ErrorState
          title="Request could not be loaded"
          description={getAuthErrorMessage(detailsQuery.error, 'The request is unavailable.')}
        />
      </div>
    );
  }
  const request = detailsQuery.data;
  if (!request)
    return (
      <div className="workspace-page request-page">
        <p>Loading request…</p>
      </div>
    );
  const isOwner = request.requesterId === user.id;
  const canEdit = isOwner && (request.status === 'DRAFT' || request.status === 'RETURNED');
  const canSubmit = isOwner && request.status === 'DRAFT';
  const canResubmit = isOwner && request.status === 'RETURNED';
  const canCancel = isOwner && ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL'].includes(request.status);

  async function runAction(action: () => Promise<unknown>, message: string) {
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(getAuthErrorMessage(actionError, message));
    }
  }

  return (
    <div className="workspace-page request-page">
      <nav className="request-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.requests}>Requests</Link>
        <span aria-hidden="true">/</span>
        <span>{request.requestNumber}</span>
      </nav>
      <PageHeader
        eyebrow={request.requestTypeName || request.requestType}
        title={request.title}
        description={request.description || 'Request details and approval tracking'}
        actions={
          <div className="request-page__header-actions">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`${APP_ROUTES.requests}/${request.id}/edit`)}
              >
                Edit
              </Button>
            )}
            {canSubmit && (
              <Button
                onClick={() =>
                  void runAction(
                    () => submit.mutateAsync(request.id),
                    'The request could not be submitted.',
                  )
                }
              >
                Submit
              </Button>
            )}
            {canResubmit && (
              <Button
                onClick={() =>
                  void runAction(
                    () => resubmit.mutateAsync(request.id),
                    'The request could not be resubmitted.',
                  )
                }
              >
                Resubmit
              </Button>
            )}
            {canCancel && (
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            )}
          </div>
        }
      />
      {error && (
        <Alert variant="error" title="Request action failed">
          {error}
        </Alert>
      )}
      <div className="request-detail-grid">
        <Card title="Overview">
          <dl className="request-detail-list">
            <div>
              <dt>Request number</dt>
              <dd>{request.requestNumber}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <RequestStatusBadge status={request.status} />
              </dd>
            </div>
            <div>
              <dt>Requester</dt>
              <dd>{request.requester?.name || (isOwner ? 'You' : request.requesterId)}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{request.department?.name || request.departmentId}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(request.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(request.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </Card>
        <Card title="Request information">
          <dl className="request-detail-list">
            {Object.entries(request.details).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>
                  {Array.isArray(value)
                    ? value.join(', ')
                    : typeof value === 'boolean'
                      ? value
                        ? 'Yes'
                        : 'No'
                      : String(value ?? '—')}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card
          title="Approval progress"
          description={
            progressQuery.data?.currentStage
              ? `Current stage: ${progressQuery.data.currentStage.stageName}`
              : 'No active approval stage'
          }
        >
          {progressQuery.isError ? (
            <p>Approval progress is currently unavailable.</p>
          ) : progressQuery.data ? (
            <ol className="request-progress">
              {Array.from(
                new Set([
                  ...progressQuery.data.completedStages,
                  ...progressQuery.data.pendingStages,
                  ...progressQuery.data.skippedStages.map((stage) => stage.sequence),
                ]),
              )
                .sort((a, b) => a - b)
                .map((sequence) => (
                  <li
                    key={sequence}
                    className={
                      progressQuery.data.completedStages.includes(sequence)
                        ? 'is-complete'
                        : progressQuery.data.currentStage?.sequence === sequence
                          ? 'is-current'
                          : ''
                    }
                  >
                    <span>Stage {sequence}</span>
                    <small>
                      {progressQuery.data.completedStages.includes(sequence)
                        ? 'Completed'
                        : progressQuery.data.currentStage?.sequence === sequence
                          ? 'Current'
                          : 'Pending'}
                    </small>
                  </li>
                ))}
            </ol>
          ) : (
            <p>Loading approval progress…</p>
          )}
        </Card>
        <Card title="Activity history">
          {historyQuery.isError ? (
            <p>Activity history is currently unavailable.</p>
          ) : historyQuery.data?.timeline.length ? (
            <ol className="request-timeline">
              {historyQuery.data.timeline.map((event, index) => (
                <li key={`${event.timestamp}-${index}`}>
                  <strong>{event.type.replaceAll('_', ' ')}</strong>
                  <span>
                    {event.actorName || 'System'} · {new Date(event.timestamp).toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>No activity has been recorded yet.</p>
          )}
        </Card>
        {request.attachments.length > 0 && (
          <Card title="Attachments">
            <ul>
              {request.attachments.map((attachment) => (
                <li key={attachment.storageKey}>
                  {attachment.filename} ({Math.round(attachment.size / 1024)} KB)
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <Modal open={cancelOpen} title="Cancel request" onOpenChange={setCancelOpen}>
        <p>This will cancel the request and any pending approval steps.</p>
        <Input
          label="Cancellation reason"
          name="cancellationReason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="request-form-actions">
          <Button variant="outline" onClick={() => setCancelOpen(false)}>
            Keep request
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            loading={cancel.isPending}
            onClick={() =>
              void runAction(async () => {
                await cancel.mutateAsync({
                  requestId: request.id,
                  cancellationReason: reason.trim(),
                });
                setCancelOpen(false);
              }, 'The request could not be cancelled.')
            }
          >
            Cancel request
          </Button>
        </div>
      </Modal>
    </div>
  );
}
