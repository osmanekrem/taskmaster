import { useForm } from '@tanstack/react-form';
import { createUserSchema } from '@taskmaster/validation';
import { useCreateUser } from '@/features/user-management/lib/api';
import { useNavigate } from '@tanstack/react-router';
import { FieldSet } from '@/components/ui/field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';
import { TextField } from '@/components/form-elements/text-field';
import { EmailField } from '@/components/form-elements/email-field';
import { PasswordField } from '@/components/form-elements/password-field';

export default function CreateUserForm() {
  const createUser = useCreateUser();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      email: '',
    },
    onSubmit: async ({ value }) => {
      await createUser.mutateAsync(value).then((result) => {
        if (result.user) {
          navigate({ to: '/user-management' });
        }
      });
    },
    validators: {
      onSubmit: createUserSchema,
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className=' w-full h-full'
    >
      <FieldSet className='h-full flex flex-col'>
        <form.Field name='firstName'>
          {(field) => <TextField field={field} label='Ad' />}
        </form.Field>

        <form.Field name='lastName'>
          {(field) => <TextField field={field} label='Soyad' />}
        </form.Field>

        <form.Field name='email'>
          {(field) => <EmailField field={field} label='E-Posta' />}
        </form.Field>

        <form.Field name='password'>
          {(field) => <PasswordField field={field} label='Şifre' />}
        </form.Field>

        <FormSubmitButton
          form={form}
          label='Kullanıcı Ekle'
          submittingLabel='Gönderiliyor...'
          className='w-full mt-auto'
        />
      </FieldSet>
    </form>
  );
}
