import { FormField } from './form-field';
import { Textarea } from '../ui/textarea';

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

type TextareaFieldProps = {
  field: FieldApi;
  label: string;
  [key: string]: any;
};

export const TextareaField = ({
  field,
  label,
  ...props
}: TextareaFieldProps) => {
  return (
    <FormField field={field} label={label}>
      <Textarea
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        name={field.name}
        id={field.name}
        {...props}
      />
    </FormField>
  );
};
