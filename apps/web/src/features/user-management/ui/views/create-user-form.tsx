import { useForm } from '@tanstack/react-form';
import { createUserSchema } from '@/features/user-management/schemas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import InputPassword from '@/components/input-password';
import { useCreateUser } from '@/features/user-management/lib/api';
import { useNavigate } from '@tanstack/react-router';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-field';

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

        <form.Field name='password'>
          {(field) => (
            <FormField field={field} label='Şifre'>
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

        <form.Subscribe>
          {(state) => (
            <Button
              type='submit'
              className='w-full mt-auto'
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? 'Gönderiliyor...' : 'Kullanıcı Ekle'}
            </Button>
          )}
        </form.Subscribe>
      </FieldSet>
    </form>
  );
}
