import { Input } from './ui/input';
import { Label } from './ui/label';

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  errors: Array<{ message?: string }>;
}

export const FormField = ({
  name,
  label,
  type = 'text',
  value,
  onBlur,
  onChange,
  errors,
}: FormFieldProps) => {
  return (
    <div className='space-y-2'>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      />
      {errors.map((error) => (
        <p key={error?.message} className='text-red-500'>
          {error?.message}
        </p>
      ))}
    </div>
  );
};

