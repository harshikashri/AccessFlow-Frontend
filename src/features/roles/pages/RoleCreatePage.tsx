import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button, Card } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission } from '@/features/authorization/permissions';
import { PermissionMatrix } from '@/features/roles/components/PermissionMatrix';
import { RoleForm } from '@/features/roles/components/RoleForm';
import { useCreateRole, usePermissionCatalog } from '@/features/roles/hooks/useRoles';
import type { RoleFormValues } from '@/features/roles/types/role.types';
import type { PermissionId } from '@/features/authorization/permission-catalog';
import { APP_ROUTES } from '@/routes/route.constants';

const initialValues: RoleFormValues = {
  name: '',
  description: '',
  rolePurpose: 'GENERAL',
};

export function RoleCreatePage() {
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [permissions, setPermissions] = useState<PermissionId[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const canCreate = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.create'));
  const actorId = canCreate ? (user?.id ?? '') : '';
  const catalogQuery = usePermissionCatalog(actorId, canCreate ? organizationId : '', canCreate);
  const createRole = useCreateRole(actorId, organizationId);

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking role creation access" />;
  }
  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canCreate
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  async function submitRole(values: RoleFormValues) {
    setSaveError(null);
    try {
      const role = await createRole.mutateAsync({
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
        permissions,
      });
      showToast({
        title: 'Role created',
        description: `${role.name} is now available in this organization.`,
        variant: 'success',
      });
      navigate(`${APP_ROUTES.roles}/${role.id}`, { replace: true });
    } catch (error) {
      setSaveError(getAuthErrorMessage(error, 'The role could not be created.'));
    }
  }

  return (
    <div className="workspace-page role-page">
      <nav className="role-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.roles}>Roles and permissions</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Create role</span>
      </nav>
      <PageHeader
        eyebrow="Organization role"
        title="Create custom role"
        description="Define a custom role using the permission catalog provided by the backend."
      />

      {catalogQuery.isPending ? (
        <LoadingState label="Loading the permission catalog" />
      ) : catalogQuery.isError || !catalogQuery.data ? (
        <ErrorState
          title="Permission catalog could not be loaded"
          description={getAuthErrorMessage(
            catalogQuery.error,
            'The backend permission catalog is required before a role can be created.',
          )}
          action={
            <Button variant="outline" onClick={() => void catalogQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <Card
            title="Role configuration"
            description="New roles are custom roles for the current organization. Organization and platform roles cannot be created here."
          >
            <RoleForm
              formId="role-create-form"
              submitLabel="Create role"
              initialValues={initialValues}
              isBuiltIn={false}
              isSaving={createRole.isPending}
              error={saveError}
              onCancel={() => navigate(APP_ROUTES.roles)}
              onSubmit={submitRole}
            >
              <section className="role-form__section" aria-labelledby="role-permissions-heading">
                <div>
                  <h2 id="role-permissions-heading">Initial permissions</h2>
                  <p>
                    A user&apos;s effective access also depends on assignment scope and other active
                    roles.
                  </p>
                </div>
                <PermissionMatrix
                  modules={catalogQuery.data.modules}
                  value={permissions}
                  onChange={setPermissions}
                />
              </section>
            </RoleForm>
          </Card>
        </>
      )}
    </div>
  );
}
