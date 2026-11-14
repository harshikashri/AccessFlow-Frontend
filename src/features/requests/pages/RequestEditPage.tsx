import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { useUserDepartmentOptions } from '@/features/users/hooks/useUsers';
import { APP_ROUTES } from '@/routes/route.constants';
import { DynamicRequestForm } from '../components/DynamicRequestForm';
import { useRequestDetails, useRequestType, useUpdateRequest } from '../hooks/useRequests';
import type { RequestPriority } from '../types/request.types';

export function RequestEditPage() {
  const { requestId = '' } = useParams();
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const organizationId = user?.organizationId ?? '';
  const canView = Boolean(
    user && hasPermission(user.authorization, 'requests.view', 'organization-or-department'),
  );
  const detailQuery = useRequestDetails(user?.id ?? '', organizationId, requestId, canView);
  const typeQuery = useRequestType(
    user?.id ?? '',
    organizationId,
    detailQuery.data?.requestTypeId ?? '',
    canView,
  );
  const departmentsQuery = useUserDepartmentOptions(
    user?.id ?? '',
    organizationId,
    canView,
    'ACTIVE',
  );
  const update = useUpdateRequest(user?.id ?? '', organizationId, requestId);
  const [departmentId, setDepartmentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('MEDIUM');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!detailQuery.data) return;
    setDepartmentId(detailQuery.data.departmentId);
    setTitle(detailQuery.data.title);
    setDescription(detailQuery.data.description);
    setPriority(detailQuery.data.priority);
    setDetails(detailQuery.data.details);
  }, [detailQuery.data]);

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canView
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  if (detailQuery.isError)
    return (
      <div className="workspace-page request-page">
        <ErrorState
          title="Request could not be loaded"
          description={getAuthErrorMessage(detailQuery.error, 'The request is unavailable.')}
        />
      </div>
    );
  const request = detailQuery.data;
  if (!request || !typeQuery.data)
    return (
      <div className="workspace-page request-page">
        <p>Loading request form…</p>
      </div>
    );
  if (request.requesterId !== user.id || !['DRAFT', 'RETURNED'].includes(request.status)) {
    return <Navigate to={`${APP_ROUTES.requests}/${request.id}`} replace />;
  }
  const currentRequest = request;

  async function save() {
    setError(null);
    try {
      await update.mutateAsync({
        departmentId,
        title,
        description,
        priority,
        details,
        attachments: currentRequest.attachments,
      });
      navigate(`${APP_ROUTES.requests}/${currentRequest.id}`);
    } catch (actionError) {
      setError(getAuthErrorMessage(actionError, 'The request could not be updated.'));
    }
  }

  return (
    <div className="workspace-page request-page">
      <PageHeader
        eyebrow="Requests"
        title="Edit request"
        description={
          request.status === 'RETURNED'
            ? request.returnReason || 'Update the request and resubmit it.'
            : 'Update your saved draft.'
        }
      />
      <Card title={typeQuery.data.name}>
        {error && (
          <Alert variant="error" title="Unable to update request">
            {error}
          </Alert>
        )}
        <div className="request-form-meta">
          <Select
            label="Department"
            name="departmentId"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            options={(departmentsQuery.data ?? []).map((department) => ({
              value: department.id,
              label: department.name,
            }))}
          />
          <Input
            label="Title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input
            label="Description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Select
            label="Priority"
            name="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as RequestPriority)}
            options={['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => ({ value, label: value }))}
          />
        </div>
        <DynamicRequestForm
          fields={typeQuery.data.fields}
          values={details}
          errors={{}}
          onChange={(key, value) => setDetails((current) => ({ ...current, [key]: value }))}
        />
        <div className="request-form-actions">
          <Button
            variant="outline"
            onClick={() => navigate(`${APP_ROUTES.requests}/${request.id}`)}
          >
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={update.isPending}>
            Save changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
