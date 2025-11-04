import { useForm } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { resetPassword } from '@/features/auth/lib/actions';
import { resetPasswordSchema } from '@/features/auth/schemas';
import { toast } from 'sonner';
import InputPassword from '@/components/input-password';
import { Field, FieldLabel, FieldSet } from '@/components/ui/field';

interface Props {
  token: string;
}

export default function ResetPasswordForm({ token }: Props) {
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
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Şifre</FieldLabel>
              <InputPassword
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className='text-destructive'>
                  {error?.message}
                </p>
              ))}
            </Field>
          )}
        </form.Field>
        <form.Field name='passwordConfirm'>
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Şifre Tekrar</FieldLabel>
              <InputPassword
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className='text-destructive'>
                  {error?.message}
                </p>
              ))}
            </Field>
          )}
        </form.Field>

        <form.Subscribe>
          {(state) => (
            <Button
              type='submit'
              className='w-full'
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? 'Gönderiliyor...' : 'Şifremi Sıfırla'}
            </Button>
          )}
        </form.Subscribe>

        <div className='w-full flex items-center justify-center gap-6'>
          <Link to='/login' className='hover:underline'>
            Giriş Yap
          </Link>
        </div>
      </FieldSet>
    </form>
  );
}
