import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, Input } from '@/components/ui';
import {
  createOrganizationPayload,
  validateOrganizationForm,
} from '@/features/organizations/utils/organization.utils';
import type {
  CreateOrganizationRequest,
  OrganizationFormErrors,
  OrganizationFormValues,
  UpdateOrganizationRequest,
} from '@/features/organizations/types/organization.types';

interface BaseOrganizationFormProps {
  initialName?: string;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
}

type OrganizationFormProps =
  | (BaseOrganizationFormProps & {
      mode: 'create';
      onSubmit: (payload: CreateOrganizationRequest) => void | Promise<void>;
    })
  | (BaseOrganizationFormProps & {
      mode: 'edit';
      initialName: string;
      onSubmit: (payload: UpdateOrganizationRequest) => void | Promise<void>;
    });

const emptyValues: OrganizationFormValues = {
  name: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

export function OrganizationForm(props: OrganizationFormProps) {
  const [values, setValues] = useState<OrganizationFormValues>({
    ...emptyValues,
    name: props.initialName ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<OrganizationFormErrors>({});

  function updateField(field: keyof OrganizationFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateOrganizationForm(values, props.mode === 'create');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (props.mode === 'create') {
      void props.onSubmit(createOrganizationPayload(values));
    } else {
      void props.onSubmit({ name: values.name.trim() });
    }
  }

  return (
    <form className="organization-form" noValidate onSubmit={handleSubmit}>
      {props.error && (
        <Alert variant="error" title="Unable to save organization">
          {props.error}
        </Alert>
      )}
      <Card
        title="Organization information"
        description="The organization name is the only profile field supported by the current API."
        className="organization-form__section"
      >
        <Input
          label="Organization name"
          name="name"
          autoComplete="organization"
          value={values.name}
          onChange={(event) => updateField('name', event.target.value)}
          required
          minLength={2}
          maxLength={200}
          {...(fieldErrors.name ? { error: fieldErrors.name } : {})}
          disabled={props.isSubmitting}
        />
      </Card>

      {props.mode === 'create' && (
        <Card
          title="Initial organization administrator"
          description="The backend creates this administrator and membership together with the organization. After creation, password instructions are requested for the administrator email."
          className="organization-form__section"
        >
          <div className="organization-form__fields">
            <Input
              label="Administrator name"
              name="adminName"
              autoComplete="name"
              value={values.adminName}
              onChange={(event) => updateField('adminName', event.target.value)}
              required
              minLength={2}
              maxLength={200}
              {...(fieldErrors.adminName ? { error: fieldErrors.adminName } : {})}
              disabled={props.isSubmitting}
            />
            <Input
              label="Administrator email"
              type="email"
              name="adminEmail"
              autoComplete="email"
              value={values.adminEmail}
              onChange={(event) => updateField('adminEmail', event.target.value)}
              required
              {...(fieldErrors.adminEmail ? { error: fieldErrors.adminEmail } : {})}
              disabled={props.isSubmitting}
            />
            <Input
              label="Temporary password"
              type="password"
              name="adminPassword"
              autoComplete="new-password"
              value={values.adminPassword}
              onChange={(event) => updateField('adminPassword', event.target.value)}
              required
              minLength={10}
              helperText="At least 10 characters with lowercase, uppercase, number, and special character. Example: Alex@2004!"
              {...(fieldErrors.adminPassword ? { error: fieldErrors.adminPassword } : {})}
              disabled={props.isSubmitting}
            />
          </div>
        </Card>
      )}

      <div className="organization-form__actions">
        <Button
          type="button"
          variant="outline"
          onClick={props.onCancel}
          disabled={props.isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={props.isSubmitting} disabled={props.isSubmitting}>
          {props.mode === 'create' ? 'Create organization' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
