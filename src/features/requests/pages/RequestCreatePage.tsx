import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { APP_ROUTES } from '@/routes/route.constants';
import { DynamicRequestForm } from '../components/DynamicRequestForm';
import {
  useCreateRequest,
  useRequestType,
  useRequestTypes,
  useSubmitRequest,
} from '../hooks/useRequests';
import type { RequestInput, RequestPriority, RequestType } from '../types/request.types';

function validateFields(fields: RequestInput['details'], definition: RequestType) {
  const errors: Record<string, string> = {};
  for (const field of definition.fields) {
    const value = fields[field.key];
    const empty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);
    if (field.required && empty) errors[field.key] = 'This field is required.';
    if (empty) continue;
    if (field.type === 'NUMBER' && typeof value !== 'number')
      errors[field.key] = 'Enter a valid number.';
    if (field.type === 'SELECT' && !field.options?.includes(String(value)))
      errors[field.key] = 'Choose a valid option.';
    if (
      field.type === 'MULTI_SELECT' &&
      (!Array.isArray(value) || value.some((item) => !field.options?.includes(String(item))))
    ) {
      errors[field.key] = 'Choose valid options.';
    }
  }
  return errors;
}

export function RequestCreatePage() {
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedTypeId, setSelectedTypeId] = useState(searchParams.get('type') ?? '');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('MEDIUM');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const canCreate = Boolean(
    user && hasPermission(user.authorization, 'requests.create', 'organization-or-department'),
  );
  const typesQuery = useRequestTypes(user?.id ?? '', organizationId, canCreate);
  const typeQuery = useRequestType(user?.id ?? '', organizationId, selectedTypeId, canCreate);
  const createRequest = useCreateRequest(user?.id ?? '', organizationId);
  const submitRequest = useSubmitRequest(user?.id ?? '', organizationId);
  const isSaving = createRequest.isPending || submitRequest.isPending;

  const selectedType = useMemo(
    () => typesQuery.data?.items.find((item) => item.id === selectedTypeId),
    [selectedTypeId, typesQuery.data?.items],
  );

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canCreate
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  if (!selectedTypeId) {
    return (
      <div className="workspace-page request-page">
        <PageHeader
          eyebrow="Requests"
          title="Start a request"
          description="Choose an active request type to begin."
        />
        <div className="request-type-grid">
          {typesQuery.isPending && (
            <Card title="Loading request types">Loading available request types…</Card>
          )}
          {typesQuery.isError && (
            <ErrorState
              title="Request types could not be loaded"
              description={getAuthErrorMessage(typesQuery.error, 'Try again later.')}
            />
          )}
          {typesQuery.data?.items.map((type) => (
            <Card
              key={type.id}
              title={type.name}
              description={type.description || 'Complete the guided request form.'}
            >
              <Button
                onClick={() => {
                  setSelectedTypeId(type.id);
                  navigate(`${APP_ROUTES.newRequest}?type=${encodeURIComponent(type.id)}`, {
                    replace: true,
                  });
                }}
              >
                Create this request
              </Button>
            </Card>
          ))}
          {typesQuery.data && !typesQuery.data.items.length && (
            <Card title="No request types available">
              There are no active request types available to you.
            </Card>
          )}
        </div>
      </div>
    );
  }

  async function saveDraft(submit = false) {
    if (!typeQuery.data) return;
    const nextErrors = validateFields(details, typeQuery.data);
    if (!title.trim()) nextErrors.title = 'A title is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setFormError(null);
    try {
      const request = await createRequest.mutateAsync({
        requestTypeId: selectedTypeId,
        title: title.trim(),
        description: '',
        priority,
        details,
        attachments: [],
      });
      if (submit) {
        await submitRequest.mutateAsync(request.id);
      }
      navigate(`${APP_ROUTES.requests}/${request.id}`);
    } catch (error) {
      setFormError(getAuthErrorMessage(error, 'The request could not be saved.'));
    }
  }

  return (
    <div className="workspace-page request-page">
      <nav className="request-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.requests}>Requests</Link>
        <span aria-hidden="true">/</span>
        <span>New request</span>
      </nav>
      <PageHeader
        eyebrow="Requests"
        title={selectedType?.name ?? 'New request'}
        {...(selectedType?.description ? { description: selectedType.description } : {})}
      />
      <Card
        title="Request details"
        description="Save a draft at any time. Submission starts the configured approval workflow."
      >
        {formError && (
          <Alert variant="error" title="Unable to save request">
            {formError}
          </Alert>
        )}
        <div className="request-form-meta">
          <Input
            label="Title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            {...(errors.title ? { error: errors.title } : {})}
            placeholder="Summarize your request"
          />
          <Select
            label="Priority"
            name="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as RequestPriority)}
            options={['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => ({ value, label: value }))}
          />
        </div>
        {typeQuery.isError ? (
          <ErrorState
            title="The request form could not be loaded"
            description={getAuthErrorMessage(
              typeQuery.error,
              'The selected request type is unavailable.',
            )}
          />
        ) : typeQuery.data ? (
          <DynamicRequestForm
            fields={typeQuery.data.fields}
            values={details}
            errors={errors}
            onChange={(key, value) => setDetails((current) => ({ ...current, [key]: value }))}
          />
        ) : (
          <p>Loading request form…</p>
        )}
        <div className="request-form-actions">
          <Button
            variant="outline"
            onClick={() => void saveDraft(false)}
            loading={isSaving}
            disabled={isSaving}
          >
            Save draft
          </Button>
          <Button onClick={() => void saveDraft(true)} loading={isSaving} disabled={isSaving}>
            Submit request
          </Button>
        </div>
      </Card>
    </div>
  );
}
