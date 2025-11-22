import { useForm } from '@tanstack/react-form';
import { setPasswordSchema } from '@/features/user-management/schemas';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { setUserPassword } from '@/features/user-management/lib/actions';
import InputPassword from '@/components/form-elements/input-password';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-elements/form-field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';

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
          label='Şifreyi Değiştir'
          submittingLabel='Gönderiliyor...'
          className='w-full'
        />
      </FieldSet>
    </form>
  );
}
