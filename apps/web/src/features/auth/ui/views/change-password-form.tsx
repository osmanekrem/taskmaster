import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '@/features/auth/lib/actions';
import { changePasswordSchema } from '@/features/auth/schemas';
import { toast } from 'sonner';
import InputPassword from '@/components/form-elements/input-password';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-elements/form-field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';

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
          {(field) => (
            <FormField field={field} label='Mevcut Şifre'>
              <InputPassword
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name='newPassword'>
          {(field) => (
            <FormField field={field} label='Yeni Şifre'>
              <InputPassword
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
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
