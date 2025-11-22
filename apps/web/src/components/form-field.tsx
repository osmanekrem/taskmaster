import type { ReactNode } from 'react';
import { Field, FieldLabel, FieldError } from './ui/field';

type FieldApi = {
  name: string;
  state: {
    value: string;
    meta: {
      errors: Array<{ message?: string } | undefined>;
    };
  };
  handleBlur: () => void;
  handleChange: (value: string) => void;
};

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
