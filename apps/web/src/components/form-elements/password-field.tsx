import { FormField } from './form-field';
import InputPassword from './input-password';

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

type PasswordFieldProps = {
  field: FieldApi;
  label: string;
  [key: string]: any;
};

export const PasswordField = ({
  field,
  label,
  ...props
}: PasswordFieldProps) => {
  return (
    <FormField field={field} label={label}>
      <InputPassword
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        name={field.name}
        id={field.name}
        type='email'
        {...props}
      />
    </FormField>
  );
};
