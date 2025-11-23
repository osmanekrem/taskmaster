import { useForm } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { resetPassword } from '@/features/auth/lib/actions';
import { resetPasswordSchema } from '@taskmaster/validation';
import { toast } from 'sonner';
import { FieldSet } from '@/components/ui/field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';
import { PasswordField } from '@/components/form-elements/password-field';

interface Props {
  readonly token: string;
}

export default function ResetPasswordForm({ token }: Readonly<Props>) {
  const navigate = useNavigate();
  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast.success('Şifreniz başarıyla sıfırlandı');
      navigate({ to: '/login' });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      password: '',
      passwordConfirm: '',
      token: token,
    },
    onSubmit: async ({ value }) => {
      await resetPasswordMutation.mutateAsync(value);
    },
    validators: {
      onSubmit: resetPasswordSchema,
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
        <form.Field name='password'>
          {(field) => <PasswordField field={field} label='Şifre' />}
        </form.Field>
        <form.Field name='passwordConfirm'>
          {(field) => <PasswordField field={field} label='Şifre Tekrar' />}
        </form.Field>

        <FormSubmitButton
          form={form}
          label='Şifremi Sıfırla'
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
