import { useForm } from '@tanstack/react-form';
import { editUserSchema } from '@taskmaster/validation';
import { type RouterOutput } from '@/utils/trpc';
import { useNavigate } from '@tanstack/react-router';
import { useEditUser } from '@/features/user-management/lib/api';
import { FieldSet } from '@/components/ui/field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';
import { TextField } from '@/components/form-elements/text-field';
import { EmailField } from '@/components/form-elements/email-field';

interface Props {
  readonly user: RouterOutput['user']['getUserById']['data'];
}

export default function EditUserForm({ user }: Readonly<Props>) {
  const navigate = useNavigate();

  const editUser = useEditUser(user.id);

  const form = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    onSubmit: async ({ value }) => {
      await editUser
        .mutateAsync({ userId: user.id, data: value })
        .then((result) => {
          if (result.id) {
            navigate({ to: '/user-management' });
          }
        });
    },
    validators: {
      onSubmit: editUserSchema,
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

        <FormSubmitButton
          form={form}
          label='Kullanıcı Düzenle'
          submittingLabel='Gönderiliyor...'
          className='w-full mt-auto'
        />
      </FieldSet>
    </form>
  );
}
