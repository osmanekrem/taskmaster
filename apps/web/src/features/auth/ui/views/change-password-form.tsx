import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '@/features/auth/lib/actions';
import { changePasswordSchema } from '@taskmaster/validation';
import { toast } from 'sonner';
import { FieldSet } from '@/components/ui/field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';
import { PasswordField } from '@/components/form-elements/password-field';

export default function ChangePasswordForm() {
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success('Şifreniz başarıyla değiştirildi');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
    onSubmit: async ({ value }) => {
      await changePasswordMutation.mutateAsync(value);
    },
    validators: {
      onSubmit: changePasswordSchema,
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className='space-y-4'
    >
      <FieldSet>
        <form.Field name='currentPassword'>
          {(field) => <PasswordField field={field} label='Mevcut Şifre' />}
        </form.Field>
        <form.Field name='newPassword'>
          {(field) => <PasswordField field={field} label='Yeni Şifre' />}
        </form.Field>

        <FormSubmitButton
          form={form}
          label='Şifremi Değiştir'
          submittingLabel='Gönderiliyor...'
          className='w-full'
        />
      </FieldSet>
    </form>
  );
}
