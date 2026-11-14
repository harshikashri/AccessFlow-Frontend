import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { isPlatformSession } from '@/features/authorization/navigation';
import { OrganizationForm } from '@/features/organizations/components/OrganizationForm';
import {
  useOrganizationDetails,
  useUpdateOrganization,
} from '@/features/organizations/hooks/useOrganizations';
import { APP_ROUTES } from '@/routes/route.constants';
import type { UpdateOrganizationRequest } from '@/features/organizations/types/organization.types';

function OrganizationEditContent({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const detailsQuery = useOrganizationDetails(userId, organizationId);
  const updateOrganization = useUpdateOrganization(userId, organizationId);
  const [formError, setFormError] = useState<string | null>(null);

  if (detailsQuery.isPending) {
    return <LoadingState label="Loading organization for editing" />;
  }

  if (!detailsQuery.data) {
    return (
      <div className="workspace-page organization-page">
        <ErrorState
          title="Organization could not be edited"
          description={getAuthErrorMessage(
            detailsQuery.error,
            'The organization details could not be loaded.',
          )}
          action={
            <Button variant="outline" onClick={() => navigate(APP_ROUTES.organizations)}>
              Back to organizations
            </Button>
          }
        />
      </div>
    );
  }

  const { organization } = detailsQuery.data;

  async function submit(payload: UpdateOrganizationRequest) {
    setFormError(null);
    try {
      await updateOrganization.mutateAsync(payload);
      showToast({
        title: 'Organization updated',
        description: `${payload.name} was saved.`,
        variant: 'success',
      });
      navigate(`${APP_ROUTES.organizations}/${organization.id}`, { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'The organization could not be updated.');
      setFormError(message);
      showToast({ title: 'Organization was not updated', description: message, variant: 'error' });
    }
  }

  return (
    <div className="workspace-page organization-page">
      <nav className="organization-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.organizations}>Organizations</Link>
        <span aria-hidden="true">/</span>
        <Link to={`${APP_ROUTES.organizations}/${organization.id}`}>{organization.name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Edit</span>
      </nav>
      <PageHeader
        eyebrow="Organization profile"
        title="Edit organization"
        description={`Update the supported profile information for ${organization.name}.`}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`${APP_ROUTES.organizations}/${organization.id}`)}
          >
            Back to details
          </Button>
        }
      />
      <OrganizationForm
        key={`${organization.id}-${organization.updatedAt}`}
        mode="edit"
        initialName={organization.name}
        isSubmitting={updateOrganization.isPending}
        error={formError}
        onCancel={() => navigate(`${APP_ROUTES.organizations}/${organization.id}`)}
        onSubmit={submit}
      />
    </div>
  );
}

export function OrganizationEditPage() {
  const { user } = useAuth();
  const { organizationId } = useParams();

  if (!user || !isPlatformSession(user)) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  if (!organizationId) {
    return <Navigate to={APP_ROUTES.organizations} replace />;
  }

  return <OrganizationEditContent userId={user.id} organizationId={organizationId} />;
}
