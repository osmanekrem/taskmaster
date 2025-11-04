import { useForm } from '@tanstack/react-form';
import { setPasswordSchema } from '@/features/user-management/schemas';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { setUserPassword } from '@/features/user-management/lib/actions';
import { Button } from '@/components/ui/button';
import InputPassword from '@/components/input-password';
import { Field, FieldLabel, FieldSet } from '@/components/ui/field';

interface Props {
  userId: string;
}

export default function SetPasswordForm({ userId }: Props) {
  const editPasswordMutation = useMutation({
    mutationFn: setUserPassword,
    onSuccess: () => {
      toast.success('Şifre başarıyla düzenlendi');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const form = useForm({
    defaultValues: {
      password: '',
    },
    onSubmit: async ({ value }) => {
      await editPasswordMutation.mutateAsync({
        userId,
        password: value.password,
      });
    },
    validators: {
      onSubmit: setPasswordSchema,
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className='w-full'
    >
      <FieldSet>
        <form.Field name='password'>
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Yeni Şifre</FieldLabel>
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
              {state.isSubmitting ? 'Gönderiliyor...' : 'Şifreyi Değiştir'}
            </Button>
          )}
        </form.Subscribe>
      </FieldSet>
    </form>
  );
}
