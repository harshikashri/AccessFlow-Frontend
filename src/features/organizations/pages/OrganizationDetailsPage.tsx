import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppIcon } from '@/components/common/AppIcon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { BackLink } from '@/components/common/BackLink';
import { PageHeader } from '@/components/common/PageHeader';
import { Button, Card } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { isPlatformSession } from '@/features/authorization/navigation';
import { OrganizationStatusBadge } from '@/features/organizations/components/OrganizationStatusBadge';
import { OrganizationStatusDialog } from '@/features/organizations/components/OrganizationStatusDialog';
import {
  useOrganizationDetails,
  useSetOrganizationStatus,
} from '@/features/organizations/hooks/useOrganizations';
import { formatOrganizationDate } from '@/features/organizations/utils/organization.utils';
import { APP_ROUTES } from '@/routes/route.constants';
import type { OrganizationStatus } from '@/features/organizations/types/organization.types';

function OrganizationDetailsContent({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const detailsQuery = useOrganizationDetails(userId, organizationId);
  const statusMutation = useSetOrganizationStatus(userId, organizationId);
  const [nextStatus, setNextStatus] = useState<OrganizationStatus | null>(null);

  if (detailsQuery.isPending) {
    return <LoadingState label="Loading organization details" />;
  }

  if (!detailsQuery.data) {
    return (
      <div className="workspace-page organization-page">
        <BackLink to={APP_ROUTES.organizations} label="Back to organizations" />
        <ErrorState
          title="Organization details unavailable"
          description={getAuthErrorMessage(
            detailsQuery.error,
            'The organization could not be loaded.',
          )}
          action={
            <div className="organization-error-actions">
              <Button variant="outline" onClick={() => void detailsQuery.refetch()}>
                Retry
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const { organization, summary } = detailsQuery.data;
  const actionStatus: OrganizationStatus = organization.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  async function confirmStatusChange() {
    if (!nextStatus) return;
    try {
      const updated = await statusMutation.mutateAsync(nextStatus);
      setNextStatus(null);
      showToast({
        title: `Organization ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`,
        description: `${updated.name} is now ${updated.status.toLowerCase()}.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Organization status was not changed',
        description: getAuthErrorMessage(error, 'Try again in a moment.'),
        variant: 'error',
      });
    }
  }

  return (
    <div className="workspace-page organization-page">
      <nav className="organization-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.organizations}>Organizations</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{organization.name}</span>
      </nav>
      <PageHeader
        eyebrow="Organization details"
        title={organization.name}
        description="Organization profile and supported platform statistics."
        backLink={{ to: APP_ROUTES.organizations, label: 'Back to organizations' }}
        actions={
          <div className="organization-page__header-actions">
            <Button
              variant="outline"
              leadingIcon={<AppIcon name="edit" size={16} />}
              onClick={() => navigate(`${APP_ROUTES.organizations}/${organization.id}/edit`)}
            >
              Edit organization
            </Button>
            <Button
              variant={organization.status === 'ACTIVE' ? 'destructive' : 'primary'}
              onClick={() => setNextStatus(actionStatus)}
            >
              {organization.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        }
      />

      <div className="organization-detail-grid">
        <Card title="Organization overview" className="organization-detail-card">
          <dl className="organization-details">
            <div>
              <dt>Status</dt>
              <dd>
                <OrganizationStatusBadge status={organization.status} />
              </dd>
            </div>
            <div>
              <dt>Organization ID</dt>
              <dd>
                <code>{organization.id}</code>
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatOrganizationDate(organization.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatOrganizationDate(organization.updatedAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Organization statistics" className="organization-detail-card">
          <dl className="organization-stat-list">
            <div>
              <dt>Total members</dt>
              <dd>{new Intl.NumberFormat().format(summary.memberCount)}</dd>
            </div>
            <div>
              <dt>Active members</dt>
              <dd>{new Intl.NumberFormat().format(summary.activeMemberCount)}</dd>
            </div>
            <div>
              <dt>Departments</dt>
              <dd>{new Intl.NumberFormat().format(summary.departmentCount)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <OrganizationStatusDialog
        organization={organization}
        nextStatus={nextStatus}
        isPending={statusMutation.isPending}
        error={
          statusMutation.isError
            ? getAuthErrorMessage(
                statusMutation.error,
                'The organization status could not be changed.',
              )
            : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setNextStatus(null);
            statusMutation.reset();
          }
        }}
        onConfirm={() => void confirmStatusChange()}
      />
    </div>
  );
}

export function OrganizationDetailsPage() {
  const { user } = useAuth();
  const { organizationId } = useParams();

  if (!user || !isPlatformSession(user)) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  if (!organizationId) {
    return <Navigate to={APP_ROUTES.organizations} replace />;
  }

  return <OrganizationDetailsContent userId={user.id} organizationId={organizationId} />;
}
