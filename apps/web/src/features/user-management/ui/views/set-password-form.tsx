import { useForm } from '@tanstack/react-form';
import { setPasswordSchema } from '@/features/user-management/schemas';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { setUserPassword } from '@/features/user-management/lib/actions';
import { FieldSet } from '@/components/ui/field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';
import { PasswordField } from '@/components/form-elements/password-field';

interface Props {
  readonly userId: string;
}

export default function SetPasswordForm({ userId }: Readonly<Props>) {
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
          {(field) => <PasswordField field={field} label='Yeni Şifre' />}
        </form.Field>

        <FormSubmitButton
          form={form}
          label='Şifreyi Değiştir'
          submittingLabel='Gönderiliyor...'
          className='w-full'
        />
      </FieldSet>
    </form>
  );
}
