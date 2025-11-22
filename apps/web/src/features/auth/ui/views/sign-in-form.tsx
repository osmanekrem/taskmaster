import { useForm } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signIn } from '@/features/auth/lib/actions';
import { signInSchema } from '@/features/auth/schemas';
import { useState } from 'react';
import { FieldSet } from '@/components/ui/field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';
import { EmailField } from '@/components/form-elements/email-field';
import { PasswordField } from '@/components/form-elements/password-field';

export default function SignInForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);

  const signInMutation = useMutation({
    mutationFn: signIn,
    onSuccess: () => {
      queryClient.resetQueries();
      navigate({ to: '/' });
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      await signInMutation.mutateAsync(value);
    },
    validators: {
      onSubmit: signInSchema,
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
          {(field) => <EmailField field={field} label='E-posta' />}
        </form.Field>

        <form.Field name='password'>
          {(field) => <PasswordField field={field} label='Şifre' />}
        </form.Field>

        <div className='w-full flex items-center justify-end gap-6'>
          <Link to='/forgot-password' className='hover:underline'>
            Şifremi Unuttum
          </Link>
        </div>

        {error && (
          <p className='bg-destructive/25 text-destructive-foreground py-1.5 px-4 rounded-md'>
            {error}
          </p>
        )}

        <FormSubmitButton
          form={form}
          label='Giriş Yap'
          submittingLabel='Gönderiliyor...'
          className='w-full'
        />
      </FieldSet>
    </form>
  );
}
