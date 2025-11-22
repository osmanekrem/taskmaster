import { FormField } from './form-field';
import { Input } from '../ui/input';

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

type TextFieldProps = {
  field: FieldApi;
  label: string;
};

export const TextField = ({ field, label }: TextFieldProps) => {
  return (
    <FormField field={field} label={label}>
      <Input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        name={field.name}
        id={field.name}
      />
    </FormField>
  );
};
