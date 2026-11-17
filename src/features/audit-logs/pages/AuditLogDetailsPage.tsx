import { Link, Navigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { IconButton } from '@/components/common/IconButton';
import { PageHeader } from '@/components/common/PageHeader';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { useAuth } from '@/features/auth/context/useAuth';
import { hasPermission } from '@/features/authorization/permissions';
import { APP_ROUTES } from '@/routes/route.constants';
import { useAuditLog } from '../hooks/useAuditLogs';

function ValueList({ values }: { values: Record<string, unknown> }) {
  return (
    <dl className="audit-change-list">
      {Object.entries(values).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '—')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditLogDetailsPage() {
  const { auditLogId = '' } = useParams();
  const { user, authorizationStatus } = useAuth();
  const canView = Boolean(
    user && hasPermission(user.authorization, 'audit_logs.view', 'organization-or-department'),
  );
  const query = useAuditLog(auditLogId, authorizationStatus === 'available' && canView);
  if (authorizationStatus !== 'available' || !user || !canView)
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  if (query.isError)
    return (
      <div className="workspace-page audit-page">
        <ErrorState
          title="Audit event unavailable"
          description={getAuthErrorMessage(
            query.error,
            'This event is outside your authorized scope.',
          )}
        />
      </div>
    );
  if (!query.data)
    return (
      <div className="workspace-page audit-page">
        <p>Loading audit event…</p>
      </div>
    );
  const item = query.data;
  return (
    <div className="workspace-page audit-page">
      <nav className="audit-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.auditLogs}>Audit logs</Link>
        <span aria-hidden="true">/</span>
        <span>Event details</span>
      </nav>
      <PageHeader
        eyebrow={item.action}
        title={`${item.resourceType} activity`}
        description={new Date(item.timestamp).toLocaleString()}
        actions={
          <IconButton
            variant="outline"
            icon="refresh"
            label="Refresh audit event"
            onClick={() => void query.refetch()}
          />
        }
      />
      <div className="audit-detail-grid">
        <Card title="Event overview">
          <dl className="audit-detail-list">
            <div>
              <dt>Actor</dt>
              <dd>{item.actor?.name || item.actorId || 'System'}</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>{item.action}</dd>
            </div>
            <div>
              <dt>Resource</dt>
              <dd>
                {item.resourceType} · {item.resourceId}
              </dd>
            </div>
            <div>
              <dt>Organization</dt>
              <dd>{item.organization?.name || item.organizationId || 'Platform'}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{item.department?.name || item.departmentId || '—'}</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd>{item.result || '—'}</dd>
            </div>
          </dl>
        </Card>
        <Card title="Recorded changes">
          <ValueList values={item.changes} />
        </Card>
        <Card title="Event metadata">
          <ValueList values={item.metadata} />
        </Card>
      </div>
    </div>
  );
}
