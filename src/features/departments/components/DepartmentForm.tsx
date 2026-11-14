import { useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { Textarea } from '@/components/ui/Textarea';
import { validateDepartmentForm } from '@/features/departments/utils/department.utils';
import type {
  CreateDepartmentRequest,
  DepartmentFormErrors,
  DepartmentFormValues,
  UpdateDepartmentRequest,
} from '@/features/departments/types/department.types';

interface BaseDepartmentFormProps {
  initialValues?: DepartmentFormValues;
  isSubmitting: boolean;
  onCancel: () => void;
}

type DepartmentFormProps =
  | (BaseDepartmentFormProps & {
      mode: 'create';
      onSubmit: (payload: CreateDepartmentRequest) => void | Promise<void>;
    })
  | (BaseDepartmentFormProps & {
      mode: 'edit';
      initialValues: DepartmentFormValues;
      onSubmit: (payload: UpdateDepartmentRequest) => void | Promise<void>;
    });

const emptyValues: DepartmentFormValues = { name: '', description: '' };

export function DepartmentForm(props: DepartmentFormProps) {
  const [values, setValues] = useState<DepartmentFormValues>(props.initialValues ?? emptyValues);
  const [fieldErrors, setFieldErrors] = useState<DepartmentFormErrors>({});

  function updateField(field: keyof DepartmentFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (props.isSubmitting) return;
    const errors = validateDepartmentForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    void props.onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
    });
  }

  return (
    <form className="department-form" noValidate onSubmit={handleSubmit}>
      <Card
        title="Department information"
        description="Departments are created in your active organization. Ownership cannot be changed here."
      >
        <div className="department-form__fields">
          <Input
            label="Department name"
            name="name"
            autoComplete="organization-title"
            value={values.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
            minLength={2}
            maxLength={200}
            {...(fieldErrors.name ? { error: fieldErrors.name } : {})}
            disabled={props.isSubmitting}
          />
          <Textarea
            label="Description"
            name="description"
            value={values.description}
            onChange={(event) => updateField('description', event.target.value)}
            maxLength={1000}
            rows={4}
            helperText="Optional, up to 1000 characters."
            {...(fieldErrors.description ? { error: fieldErrors.description } : {})}
            disabled={props.isSubmitting}
          />
        </div>
      </Card>
      <div className="department-form__actions">
        <Button
          type="button"
          variant="outline"
          onClick={props.onCancel}
          disabled={props.isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={props.isSubmitting} disabled={props.isSubmitting}>
          {props.mode === 'create' ? 'Create department' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
