import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from '@/features/auth/lib/actions';
import { forgotPasswordSchema } from '@/features/auth/schemas';
import { toast } from 'sonner';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-elements/form-field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';

export default function ForgotPasswordForm() {
  const forgotPasswordMutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      toast.success('Şifre Sıfırlama E-postası gönderildi');
    },
    onError: (error) => {
      toast.error('Şifre Sıfırlama E-postası gönderilirken bir hata oluştu');
    },
  });

  const form = useForm({
    defaultValues: {
      email: '',
    },
    onSubmit: async ({ value }) => {
      await forgotPasswordMutation.mutateAsync(value);
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FieldSet>
        <form.Field name='email'>
          {(field) => (
            <FormField field={field} label='E-posta'>
              <Input
                id={field.name}
                name={field.name}
                type='email'
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>

        <FormSubmitButton
          form={form}
          label='Şifremi Unuttum'
          submittingLabel='Gönderiliyor...'
          className='w-full'
        />

        <div className='w-full flex items-center justify-center gap-6'>
          <Link to='/login' className='hover:underline'>
            Giriş Yap
          </Link>
        </div>
      </FieldSet>
    </form>
  );
}
