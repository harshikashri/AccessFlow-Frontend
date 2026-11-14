import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Alert, Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission } from '@/features/authorization/permissions';
import { DepartmentForm } from '@/features/departments/components/DepartmentForm';
import { useCreateDepartment } from '@/features/departments/hooks/useDepartments';
import type {
  CreateDepartmentRequest,
  Department,
} from '@/features/departments/types/department.types';
import { APP_ROUTES } from '@/routes/route.constants';

export function DepartmentCreatePage() {
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [createdDepartment, setCreatedDepartment] = useState<Department | null>(null);
  const organizationId = user?.organizationId ?? '';
  const createDepartment = useCreateDepartment(user?.id ?? '', organizationId);

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking department creation access" />;
  }

  if (
    authorizationStatus !== 'available' ||
    !user ||
    user.platformRole === 'SUPER_ADMIN' ||
    !organizationId ||
    !hasOrganizationPermission(user.authorization, 'departments.create')
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  const authenticatedUser = user;

  async function submit(payload: CreateDepartmentRequest) {
    setFormError(null);
    try {
      const department = await createDepartment.mutateAsync(payload);
      showToast({
        title: 'Department created',
        description: `${department.name} is ready in your organization.`,
        variant: 'success',
      });
      if (hasOrganizationPermission(authenticatedUser.authorization, 'departments.view')) {
        navigate(`${APP_ROUTES.departments}/${department.id}`, { replace: true });
      } else {
        setCreatedDepartment(department);
      }
    } catch (error) {
      const message = getAuthErrorMessage(error, 'The department could not be created.');
      setFormError(message);
      showToast({ title: 'Department was not created', description: message, variant: 'error' });
    }
  }

  return (
    <div className="workspace-page department-page">
      <nav className="department-breadcrumb" aria-label="Breadcrumb">
        <Button variant="ghost" size="sm" onClick={() => navigate(APP_ROUTES.departments)}>
          Departments
        </Button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Create</span>
      </nav>
      <PageHeader
        eyebrow="Departments"
        title="Create department"
        description="Add a department to your active organization."
        actions={
          <Button variant="outline" onClick={() => navigate(APP_ROUTES.departments)}>
            Back to departments
          </Button>
        }
      />
      {createdDepartment ? (
        <Alert variant="success" title="Department created">
          <p>{createdDepartment.name} was created successfully.</p>
          <p>
            Department ID: <code>{createdDepartment.id}</code>
          </p>
          <p>
            Your current permissions do not include organization-wide department viewing, so this
            department cannot be opened from this session.
          </p>
        </Alert>
      ) : (
        <>
          {formError && (
            <Alert variant="error" title="Unable to create department">
              {formError}
            </Alert>
          )}
          <DepartmentForm
            mode="create"
            isSubmitting={createDepartment.isPending}
            onCancel={() => navigate(APP_ROUTES.departments)}
            onSubmit={submit}
          />
        </>
      )}
    </div>
  );
}
