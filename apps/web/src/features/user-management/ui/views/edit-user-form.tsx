import { useForm } from '@tanstack/react-form';
import { editUserSchema } from '@/features/user-management/schemas';
import { Input } from '@/components/ui/input';
import { type RouterOutput } from '@/utils/trpc';
import { useNavigate } from '@tanstack/react-router';
import { useEditUser } from '@/features/user-management/lib/api';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-elements/form-field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';

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
          {(field) => (
            <FormField field={field} label='Ad'>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name='lastName'>
          {(field) => (
            <FormField field={field} label='Soyad'>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name='email'>
          {(field) => (
            <FormField field={field} label='E-Posta'>
              <Input
                id={field.name}
                name={field.name}
                type='email'
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
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
