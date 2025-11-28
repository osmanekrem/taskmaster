import type { ReactNode } from 'react';
import { Field, FieldLabel, FieldError } from '../ui/field';
import type { FieldApi } from './types';

type FormFieldProps = {
  field: FieldApi;
  children: ReactNode;
  label: string;
};

export const FormField = ({ field, children, label }: FormFieldProps) => {
  return (
    <Field>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {children}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
};
