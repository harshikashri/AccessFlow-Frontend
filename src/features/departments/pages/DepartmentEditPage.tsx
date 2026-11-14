import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { Alert, Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import {
  canEditDepartment,
  canViewDepartment,
  isDepartmentId,
} from '@/features/departments/utils/department.utils';
import { DepartmentForm } from '@/features/departments/components/DepartmentForm';
import {
  useDepartmentDetails,
  useUpdateDepartment,
} from '@/features/departments/hooks/useDepartments';
import type {
  DepartmentFormValues,
  UpdateDepartmentRequest,
} from '@/features/departments/types/department.types';
import { APP_ROUTES } from '@/routes/route.constants';

export function DepartmentEditPage() {
  const { user, authorizationStatus } = useAuth();
  const { departmentId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const validId = isDepartmentId(departmentId);
  const canView = Boolean(
    user &&
    authorizationStatus === 'available' &&
    organizationId &&
    validId &&
    canViewDepartment(user, departmentId),
  );
  const canEdit = Boolean(
    user &&
    authorizationStatus === 'available' &&
    organizationId &&
    validId &&
    canEditDepartment(user, departmentId),
  );
  const detailsQuery = useDepartmentDetails(user?.id ?? '', organizationId, departmentId, canView);
  const updateDepartment = useUpdateDepartment(user?.id ?? '', organizationId, departmentId);

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking department edit access" />;
  }

  if (!user || user.platformRole === 'SUPER_ADMIN' || !organizationId) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  if (!validId) {
    return (
      <div className="workspace-page department-page">
        <ErrorState
          title="Invalid department link"
          description="The department ID in this address is not valid."
          action={
            <Button variant="outline" onClick={() => navigate(APP_ROUTES.departments)}>
              Back to departments
            </Button>
          }
        />
      </div>
    );
  }
  if (authorizationStatus !== 'available' || !canView || !canEdit) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  if (detailsQuery.isPending) {
    return <LoadingState label="Loading department for editing" />;
  }

  if (!detailsQuery.data) {
    return (
      <div className="workspace-page department-page">
        <ErrorState
          title="Department could not be edited"
          description={getAuthErrorMessage(
            detailsQuery.error,
            'The department details could not be loaded.',
          )}
          action={
            <div className="department-error-actions">
              <Button variant="outline" onClick={() => void detailsQuery.refetch()}>
                Retry
              </Button>
              <Button variant="ghost" onClick={() => navigate(APP_ROUTES.departments)}>
                Back to departments
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const { department } = detailsQuery.data;
  if (department.status === 'INACTIVE') {
    return (
      <div className="workspace-page department-page">
        <ErrorState
          title="Inactive departments cannot be edited"
          description="Activate the department before changing its name or description."
          action={
            <Button
              variant="outline"
              onClick={() => navigate(`${APP_ROUTES.departments}/${department.id}`)}
            >
              Back to department
            </Button>
          }
        />
      </div>
    );
  }

  async function submit(payload: UpdateDepartmentRequest) {
    const currentValues: DepartmentFormValues = {
      name: department.name,
      description: department.description,
    };
    const changed: UpdateDepartmentRequest = {};
    if (payload.name !== undefined && payload.name.trim() !== currentValues.name) {
      changed.name = payload.name.trim();
    }
    if (
      payload.description !== undefined &&
      payload.description.trim() !== currentValues.description
    ) {
      changed.description = payload.description.trim();
    }
    if (Object.keys(changed).length === 0) {
      showToast({
        title: 'No changes to save',
        description: 'The department details are already up to date.',
        variant: 'information',
      });
      navigate(`${APP_ROUTES.departments}/${department.id}`);
      return;
    }

    setFormError(null);
    try {
      await updateDepartment.mutateAsync(changed);
      showToast({
        title: 'Department updated',
        description: `${changed.name ?? department.name} was saved.`,
        variant: 'success',
      });
      navigate(`${APP_ROUTES.departments}/${department.id}`, { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'The department could not be updated.');
      setFormError(message);
      showToast({ title: 'Department was not updated', description: message, variant: 'error' });
    }
  }

  return (
    <div className="workspace-page department-page">
      <nav className="department-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.departments}>Departments</Link>
        <span aria-hidden="true">/</span>
        <Link to={`${APP_ROUTES.departments}/${department.id}`}>{department.name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Edit</span>
      </nav>
      <PageHeader
        eyebrow="Department profile"
        title="Edit department"
        description={`Update the supported details for ${department.name}.`}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`${APP_ROUTES.departments}/${department.id}`)}
          >
            Back to details
          </Button>
        }
      />
      {formError && (
        <Alert variant="error" title="Unable to save department">
          {formError}
        </Alert>
      )}
      <DepartmentForm
        key={`${department.id}-${department.updatedAt}`}
        mode="edit"
        initialValues={{ name: department.name, description: department.description }}
        isSubmitting={updateDepartment.isPending}
        onCancel={() => navigate(`${APP_ROUTES.departments}/${department.id}`)}
        onSubmit={submit}
      />
    </div>
  );
}
