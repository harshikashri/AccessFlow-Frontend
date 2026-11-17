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

function formatActivityType(type: string): string {
  return type
    .split('_')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

export function RequestDetailsPage() {
  const { requestId = '' } = useParams();
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
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
  const progress = progressQuery.data;
  const skippedStages = new Map(
    (progress?.skippedStages ?? []).map((stage) => [stage.sequence, stage]),
  );
  const stageSequences = progress
    ? Array.from(
        new Set([
          ...(progress.stages?.map((stage) => stage.sequence) ?? []),
          ...progress.completedStages,
          ...progress.pendingStages,
          ...progress.skippedStages.map((stage) => stage.sequence),
        ]),
      ).sort((a, b) => a - b)
    : [];
  const activityEvents = historyQuery.data?.timeline ?? [];
  const recentEvents = showAllActivity ? activityEvents : activityEvents.slice(-5);
  const visibleActivityEvents = [...recentEvents].reverse();

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
              <dd>
                {request.department?.name ||
                  (request.departmentId ? request.departmentId : 'Organization-level')}
              </dd>
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
          title="Approval stages"
          description={
            progress?.currentStage
              ? `Current stage: ${progress.currentStage.stageName}`
              : 'No active approval stage'
          }
        >
          {progressQuery.isError ? (
            <p className="request-tracking-state">
              Approval progress is currently unavailable.
            </p>
          ) : progress && stageSequences.length ? (
            <ol className="request-progress" aria-label="Approval stages">
              {stageSequences.map((sequence) => {
                const isSkipped = skippedStages.has(sequence);
                const isCurrent = progress.currentStage?.sequence === sequence;
                const isComplete = progress.completedStages.includes(sequence) && !isSkipped;
                const stage = progress.stages?.find((item) => item.sequence === sequence);
                const isRejected = stage?.status === 'REJECTED';
                const isReturned = stage?.status === 'RETURNED';
                const isCancelled = stage?.status === 'CANCELLED';
                let state:
                  | 'skipped'
                  | 'rejected'
                  | 'returned'
                  | 'cancelled'
                  | 'complete'
                  | 'current'
                  | 'pending' = 'pending';
                if (isSkipped) state = 'skipped';
                else if (isRejected) state = 'rejected';
                else if (isReturned) state = 'returned';
                else if (isCancelled) state = 'cancelled';
                else if (isComplete) state = 'complete';
                else if (isCurrent) state = 'current';
                const stageName =
                  stage?.stageName ??
                  skippedStages.get(sequence)?.stageName ??
                  (isCurrent ? progress.currentStage?.stageName : undefined) ??
                  `Stage ${sequence}`;
                const stateLabels = {
                  complete: 'Completed',
                  skipped: 'Skipped',
                  rejected: 'Rejected',
                  returned: 'Returned',
                  cancelled: 'Cancelled',
                  current: 'In progress',
                  pending: 'Waiting',
                };
                const stateLabel = stateLabels[state];

                return (
                  <li key={sequence} className={`request-progress__item is-${state}`}>
                    <details className="request-progress__disclosure">
                      <summary aria-current={isCurrent ? 'step' : undefined}>
                        <span className="request-progress__marker" aria-hidden="true">
                          {sequence}
                        </span>
                        <span className="request-progress__details">
                          <strong>{stageName}</strong>
                          <span>Stage {sequence}</span>
                        </span>
                        <span className="request-progress__status">{stateLabel}</span>
                      </summary>
                      <div className="request-progress__content">
                        {stage ? (
                          <dl className="request-progress__info">
                            {stage.description && (
                              <div>
                                <dt>Stage details</dt>
                                <dd>{stage.description}</dd>
                              </div>
                            )}
                            <div>
                              <dt>Approver</dt>
                              <dd>
                                {stage.approverRoleName ??
                                  (stage.approverNames.length
                                    ? stage.approverNames.join(', ')
                                    : formatActivityType(stage.approverType))}
                              </dd>
                            </div>
                            <div>
                              <dt>Approval rule</dt>
                              <dd>{stage.approvalMode === 'ALL' ? 'All approvers' : 'Any approver'}</dd>
                            </div>
                            <div>
                              <dt>Scope</dt>
                              <dd>
                                {stage.scopeType
                                  ? formatActivityType(stage.scopeType)
                                  : 'Not specified'}
                              </dd>
                            </div>
                            <div>
                              <dt>Due date</dt>
                              <dd>
                                {stage.slaDueAt
                                  ? new Date(stage.slaDueAt).toLocaleString()
                                  : 'No deadline'}
                              </dd>
                            </div>
                            {stage.comments.length > 0 && (
                              <div>
                                <dt>Decision notes</dt>
                                <dd>{stage.comments.join(' · ')}</dd>
                              </div>
                            )}
                          </dl>
                        ) : (
                          <p className="request-tracking-state">
                            Detailed stage information is unavailable.
                          </p>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          ) : progress ? (
            <p className="request-tracking-state">No approval stages have been recorded yet.</p>
          ) : (
            <p className="request-tracking-state">Loading approval stages…</p>
          )}
        </Card>
        <Card title="Activity history">
          {historyQuery.isError ? (
            <p className="request-tracking-state">
              Activity history is currently unavailable.
            </p>
          ) : activityEvents.length ? (
            <ol className="request-timeline" aria-label="Request activity">
              {visibleActivityEvents.map((event, index) => (
                <li key={`${event.timestamp}-${index}`}>
                  <div className="request-timeline__entry">
                    <strong>{formatActivityType(event.type)}</strong>
                    <div className="request-timeline__meta">
                      <span>{event.actorName || 'System'}</span>
                      <time dateTime={event.timestamp}>
                        {new Date(event.timestamp).toLocaleString()}
                      </time>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="request-tracking-state">No activity has been recorded yet.</p>
          )}
          {activityEvents.length > 5 && (
            <Button
              className="request-timeline__toggle"
              size="sm"
              variant="ghost"
              aria-expanded={showAllActivity}
              onClick={() => setShowAllActivity((expanded) => !expanded)}
            >
              {showAllActivity ? 'Show recent activity' : `Show all activity (${activityEvents.length})`}
            </Button>
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
