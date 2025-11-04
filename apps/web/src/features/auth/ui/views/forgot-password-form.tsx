import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from '@/features/auth/lib/actions';
import { forgotPasswordSchema } from '@/features/auth/schemas';
import { toast } from 'sonner';
import { Field, FieldSet, FieldLabel } from '@/components/ui/field';

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
            <Field>
              <FieldLabel htmlFor={field.name}>E-posta</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type='email'
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
              {state.isSubmitting ? 'Gönderiliyor...' : 'Şifremi Unuttum'}
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
