import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input, Modal } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { APP_ROUTES } from '@/routes/route.constants';
import {
  useApproveApproval,
  useApprovalDetails,
  useClaimApproval,
  useRejectApproval,
  useReturnApproval,
} from '../hooks/useApprovals';

type Action = 'approve' | 'reject' | 'return' | null;

export function ApprovalDetailsPage() {
  const { approvalStepId = '' } = useParams();
  const { user, authorizationStatus } = useAuth();
  const [action, setAction] = useState<Action>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const canApprove = Boolean(
    user && hasPermission(user.authorization, 'requests.approve', 'organization-or-department'),
  );
  const query = useApprovalDetails(user?.id ?? '', organizationId, approvalStepId, canApprove);
  const claim = useClaimApproval(user?.id ?? '', organizationId);
  const approve = useApproveApproval(user?.id ?? '', organizationId);
  const reject = useRejectApproval(user?.id ?? '', organizationId);
  const returnApproval = useReturnApproval(user?.id ?? '', organizationId);

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canApprove
  )
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  if (query.isError)
    return (
      <div className="workspace-page approval-page">
        <ErrorState
          title="Approval details unavailable"
          description={getAuthErrorMessage(
            query.error,
            'This approval is unavailable or outside your scope.',
          )}
        />
      </div>
    );
  if (!query.data)
    return (
      <div className="workspace-page approval-page">
        <p>Loading approval details…</p>
      </div>
    );

  const { approval, request, history } = query.data;
  const requester =
    request.requesterId && typeof request.requesterId === 'object' ? request.requesterId : null;
  const department =
    request.departmentId && typeof request.departmentId === 'object' ? request.departmentId : null;
  const isClaimedByMe = approval.claimedBy === user.id;
  const canClaim =
    approval.status === 'ACTIVE' &&
    approval.assignmentResolution === 'CLAIM_ONE' &&
    !approval.claimedBy;
  const canAct = approval.status === 'ACTIVE' || isClaimedByMe;

  async function execute() {
    if (!action || (action !== 'approve' && !comment.trim())) return;
    setError(null);
    try {
      if (action === 'approve')
        await approve.mutateAsync({ stepId: approval.id, text: comment.trim() });
      if (action === 'reject')
        await reject.mutateAsync({ stepId: approval.id, text: comment.trim() });
      if (action === 'return')
        await returnApproval.mutateAsync({ stepId: approval.id, text: comment.trim() });
      setAction(null);
      setComment('');
    } catch (actionError) {
      setError(getAuthErrorMessage(actionError, 'The approval action could not be completed.'));
    }
  }

  return (
    <div className="workspace-page approval-page">
      <nav className="approval-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.approvals}>Approvals</Link>
        <span aria-hidden="true">/</span>
        <span>{approval.stageName}</span>
      </nav>
      <PageHeader
        eyebrow={
          typeof request.requestTypeName === 'string' ? request.requestTypeName : 'Approval task'
        }
        title={typeof request.title === 'string' ? request.title : 'Request approval'}
        description={
          typeof request.description === 'string'
            ? request.description
            : 'Review the request and record your decision.'
        }
        actions={
          <Button variant="outline" onClick={() => void query.refetch()}>
            Refresh
          </Button>
        }
      />
      {error && (
        <Alert variant="error" title="Approval action failed">
          {error}
        </Alert>
      )}
      <div className="approval-detail-grid">
        <Card title="Request overview">
          <dl className="approval-detail-list">
            <div>
              <dt>Request</dt>
              <dd>
                {typeof request.requestNumber === 'string'
                  ? request.requestNumber
                  : String(request._id || '—')}
              </dd>
            </div>
            <div>
              <dt>Requester</dt>
              <dd>{typeof requester?.name === 'string' ? requester.name : 'Restricted'}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{typeof department?.name === 'string' ? department.name : 'Restricted'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{request.status || '—'}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>
                {request.submittedAt ? new Date(String(request.submittedAt)).toLocaleString() : '—'}
              </dd>
            </div>
          </dl>
        </Card>
        <Card
          title="Approval stage"
          description={`Sequence ${approval.sequence} · ${approval.approvalMode} approval`}
        >
          <dl className="approval-detail-list">
            <div>
              <dt>Stage</dt>
              <dd>{approval.stageName}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{approval.status}</dd>
            </div>
            <div>
              <dt>Assignment</dt>
              <dd>
                {approval.assignmentResolution === 'CLAIM_ONE' ? 'Claim-one' : 'Direct assignment'}
              </dd>
            </div>
            <div>
              <dt>SLA deadline</dt>
              <dd>
                {approval.slaDueAt
                  ? new Date(approval.slaDueAt).toLocaleString()
                  : 'No deadline configured'}
              </dd>
            </div>
          </dl>
          <div className="approval-actions">
            {canClaim && (
              <Button onClick={() => void claim.mutateAsync(approval.id)} loading={claim.isPending}>
                Claim approval
              </Button>
            )}
            {isClaimedByMe && <span className="approval-claim-note">Claimed by you</span>}
            {canAct && (
              <>
                <Button onClick={() => setAction('approve')}>Approve</Button>
                <Button variant="destructive" onClick={() => setAction('reject')}>
                  Reject
                </Button>
                <Button variant="outline" onClick={() => setAction('return')}>
                  Return for correction
                </Button>
              </>
            )}
          </div>
        </Card>
        <Card title="Request information">
          <dl className="approval-detail-list">
            {Object.entries(request.details || {}).map(([key, value]) => (
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
        <Card title="Approval history">
          {history.length ? (
            <ol className="approval-history">
              {history.map((item) => (
                <li key={item.id}>
                  <strong>{item.stageName}</strong>
                  <span>
                    {item.status} · {item.comments || 'No comment'}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>No previous approval actions.</p>
          )}
        </Card>
      </div>
      <Modal
        open={Boolean(action)}
        title={
          action === 'approve'
            ? 'Approve request'
            : action === 'reject'
              ? 'Reject request'
              : 'Return request'
        }
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        <p>
          {action === 'approve'
            ? 'Record approval for this stage.'
            : action === 'reject'
              ? 'A rejection comment is required.'
              : 'Explain what the requester must correct.'}
        </p>
        <Input
          label={action === 'approve' ? 'Comment (optional)' : 'Comment'}
          name="approval-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <div className="approval-actions">
          <Button variant="outline" onClick={() => setAction(null)}>
            Cancel
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'primary'}
            disabled={action !== 'approve' && !comment.trim()}
            loading={approve.isPending || reject.isPending || returnApproval.isPending}
            onClick={() => void execute()}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}
