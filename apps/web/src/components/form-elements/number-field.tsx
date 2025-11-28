import { FormField } from './form-field';
import { Input } from '../ui/input';

import type { FieldApi } from './types';

type NumberFieldProps = {
  field: FieldApi;
  label: string;
  [key: string]: any;
};

export const NumberField = ({ field, label, ...props }: NumberFieldProps) => {
  return (
    <FormField field={field} label={label}>
      <Input
        value={field.state.value}
        onChange={(e) => {
          const value = e.target.value;
          field.handleChange(value === '' ? '' : Number(value));
        }}
        onBlur={field.handleBlur}
        name={field.name}
        id={field.name}
        type='number'
        {...props}
      />
    </FormField>
  );
};
