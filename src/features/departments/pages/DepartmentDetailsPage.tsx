import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { Alert, Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission } from '@/features/authorization/permissions';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { AssignManagerDialog } from '@/features/departments/components/AssignManagerDialog';
import { DepartmentManagerCard } from '@/features/departments/components/DepartmentManagerCard';
import { DepartmentMembers } from '@/features/departments/components/DepartmentMembers';
import { DepartmentOverview } from '@/features/departments/components/DepartmentOverview';
import { DepartmentStats } from '@/features/departments/components/DepartmentStats';
import { DepartmentStatusDialog } from '@/features/departments/components/DepartmentStatusDialog';
import {
  useDepartmentDetails,
  useDepartmentManagerCandidates,
  useReplaceDepartmentManagers,
  useSetDepartmentStatus,
} from '@/features/departments/hooks/useDepartments';
import {
  canEditDepartment,
  canViewDepartment,
  isDepartmentId,
} from '@/features/departments/utils/department.utils';
import type { DepartmentStatus } from '@/features/departments/types/department.types';
import { APP_ROUTES } from '@/routes/route.constants';

function DepartmentDetailsContent({
  userId,
  organizationId,
  departmentId,
  canEdit,
  canManageManagers,
  actor,
}: {
  userId: string;
  organizationId: string;
  departmentId: string;
  canEdit: boolean;
  canManageManagers: boolean;
  actor: AuthenticatedUser;
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [nextStatus, setNextStatus] = useState<DepartmentStatus | null>(null);
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const detailsQuery = useDepartmentDetails(userId, organizationId, departmentId);
  const statusMutation = useSetDepartmentStatus(userId, organizationId, departmentId);
  const managerMutation = useReplaceDepartmentManagers(userId, organizationId, departmentId);
  const candidateQuery = useDepartmentManagerCandidates(
    userId,
    organizationId,
    departmentId,
    managerDialogOpen && canManageManagers,
  );

  if (detailsQuery.isPending) {
    return <LoadingState label="Loading department details" />;
  }

  if (!detailsQuery.data) {
    return (
      <div className="workspace-page department-page">
        <ErrorState
          title="Department details unavailable"
          description={getAuthErrorMessage(
            detailsQuery.error,
            'The department could not be loaded.',
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

  const { department, managers, members, summary } = detailsQuery.data;
  const nextStatusValue: DepartmentStatus = department.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  async function confirmStatusChange() {
    if (!nextStatus) return;
    try {
      const updated = await statusMutation.mutateAsync(nextStatus);
      setNextStatus(null);
      showToast({
        title: `Department ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`,
        description: `${updated.name} is now ${updated.status.toLowerCase()}.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Department status was not changed',
        description: getAuthErrorMessage(error, 'Try again in a moment.'),
        variant: 'error',
      });
    }
  }

  async function saveManagers(managerIds: string[]) {
    try {
      await managerMutation.mutateAsync(managerIds);
      setManagerDialogOpen(false);
      showToast({
        title: 'Department managers updated',
        description: 'The complete manager list was saved.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Manager assignments were not changed',
        description: getAuthErrorMessage(
          error,
          'The selected users may not meet the backend manager eligibility rules.',
        ),
        variant: 'error',
      });
    }
  }

  return (
    <div className="workspace-page department-page">
      <nav className="department-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.departments}>Departments</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{department.name}</span>
      </nav>
      <PageHeader
        eyebrow="Department details"
        title={department.name}
        description="Department profile and authorized membership overview."
        actions={
          <div className="department-page__header-actions">
            <Button variant="outline" onClick={() => navigate(APP_ROUTES.departments)}>
              Back
            </Button>
            {canEdit && department.status === 'ACTIVE' && (
              <Button
                variant="outline"
                onClick={() => navigate(`${APP_ROUTES.departments}/${department.id}/edit`)}
              >
                Edit department
              </Button>
            )}
            {canEdit && (
              <Button
                variant={department.status === 'ACTIVE' ? 'destructive' : 'primary'}
                onClick={() => {
                  statusMutation.reset();
                  setNextStatus(nextStatusValue);
                }}
              >
                {department.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            )}
          </div>
        }
      />
      <div className="department-detail-grid">
        <DepartmentOverview department={department} />
        <DepartmentStats summary={summary} />
        <DepartmentManagerCard
          managers={managers}
          canManage={canManageManagers && canEdit && department.status === 'ACTIVE'}
          onManage={() => {
            managerMutation.reset();
            setManagerDialogOpen(true);
          }}
        />
      </div>
      <DepartmentMembers members={members} actor={actor} />
      <Alert variant="information" title="Activity history">
        Department audit events are recorded by the backend, but there is no department activity
        read endpoint available to this workspace.
      </Alert>
      <DepartmentStatusDialog
        department={department}
        nextStatus={nextStatus}
        isPending={statusMutation.isPending}
        error={
          statusMutation.isError
            ? getAuthErrorMessage(
                statusMutation.error,
                'The department status could not be changed.',
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
      <AssignManagerDialog
        open={managerDialogOpen}
        departmentName={department.name}
        currentManagers={managers}
        candidates={candidateQuery.data}
        isLoading={candidateQuery.isPending}
        isError={candidateQuery.isError}
        loadError={
          candidateQuery.isError
            ? getAuthErrorMessage(candidateQuery.error, 'Manager candidates could not be verified.')
            : null
        }
        isSaving={managerMutation.isPending}
        saveError={
          managerMutation.isError
            ? getAuthErrorMessage(
                managerMutation.error,
                'The backend did not accept the selected manager list.',
              )
            : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setManagerDialogOpen(false);
            managerMutation.reset();
          }
        }}
        onRetry={() => void candidateQuery.refetch()}
        onSubmit={(managerIds) => void saveManagers(managerIds)}
      />
    </div>
  );
}

export function DepartmentDetailsPage() {
  const { user, authorizationStatus } = useAuth();
  const { departmentId = '' } = useParams();
  const navigate = useNavigate();
  const organizationId = user?.organizationId ?? '';

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking department access" />;
  }

  if (!user || user.platformRole === 'SUPER_ADMIN' || !organizationId) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  if (!isDepartmentId(departmentId)) {
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
  if (authorizationStatus !== 'available' || !canViewDepartment(user, departmentId)) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  const canEdit = canEditDepartment(user, departmentId);
  const canManageManagers =
    canEdit &&
    hasOrganizationPermission(user.authorization, 'roles.view') &&
    hasOrganizationPermission(user.authorization, 'users.view');

  return (
    <DepartmentDetailsContent
      userId={user.id}
      organizationId={organizationId}
      departmentId={departmentId}
      canEdit={canEdit}
      canManageManagers={canManageManagers}
      actor={user}
    />
  );
}
