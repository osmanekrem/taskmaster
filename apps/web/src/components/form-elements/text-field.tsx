import { FormField } from './form-field';
import { Input } from '../ui/input';

import type { FieldApi } from './types';

type TextFieldProps = {
  field: FieldApi;
  label: string;
  [key: string]: any;
};

export const TextField = ({ field, label, ...props }: TextFieldProps) => {
  return (
    <FormField field={field} label={label}>
      <Input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        name={field.name}
        id={field.name}
        type='text'
        {...props}
      />
    </FormField>
  );
};
