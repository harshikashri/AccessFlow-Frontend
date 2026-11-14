import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { isPlatformSession } from '@/features/authorization/navigation';
import { OrganizationForm } from '@/features/organizations/components/OrganizationForm';
import { useCreateOrganization } from '@/features/organizations/hooks/useOrganizations';
import { APP_ROUTES } from '@/routes/route.constants';
import type { CreateOrganizationRequest } from '@/features/organizations/types/organization.types';

function OrganizationCreateContent({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createOrganization = useCreateOrganization(userId);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(payload: CreateOrganizationRequest) {
    setFormError(null);
    try {
      const result = await createOrganization.mutateAsync(payload);
      showToast({
        title: 'Organization created',
        description: `${result.organization.name} and its initial administrator were created.`,
        variant: 'success',
      });
      navigate(`${APP_ROUTES.organizations}/${result.organization.id}`, { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'The organization could not be created.');
      setFormError(message);
      showToast({ title: 'Organization was not created', description: message, variant: 'error' });
    }
  }

  return (
    <div className="workspace-page organization-page">
      <PageHeader
        eyebrow="Organizations"
        title="Create organization"
        description="Set up an organization and its initial administrator."
        actions={
          <Button variant="outline" onClick={() => navigate(APP_ROUTES.organizations)}>
            Back to organizations
          </Button>
        }
      />
      <OrganizationForm
        mode="create"
        isSubmitting={createOrganization.isPending}
        error={formError}
        onCancel={() => navigate(APP_ROUTES.organizations)}
        onSubmit={submit}
      />
    </div>
  );
}

export function OrganizationCreatePage() {
  const { user } = useAuth();

  if (!user || !isPlatformSession(user)) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  return <OrganizationCreateContent userId={user.id} />;
}
