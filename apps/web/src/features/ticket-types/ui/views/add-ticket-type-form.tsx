import { useForm } from '@tanstack/react-form';
import { createTicketTypeSchema } from '@/features/ticket-types/schemas';
import { useCreateTicketTypeMutation } from '@/features/ticket-types/lib/mutations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import TicketTypeIconSelect from '../components/ticket-type-icon-select';
import useAddTicketTypeModal from '@/features/ticket-types/hooks/use-add-ticket-type-modal';
import { Field, FieldLabel, FieldSet } from '@/components/ui/field';

export default function AddTicketTypeForm() {
  const createTicketType = useCreateTicketTypeMutation();
  const { close } = useAddTicketTypeModal();
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      icon: '',
    },
    onSubmit: async ({ value }) => {
      await createTicketType.mutateAsync(value, {
        onSuccess: () => {
          form.reset();
          close();
        },
      });
    },
    validators: {
      onSubmit: createTicketTypeSchema,
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className=' p-4 w-full h-full'
    >
      <FieldSet className='h-full flex flex-col'>
        <form.Field name='name'>
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Bilet Türü Adı *</FieldLabel>
              <Input
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

        <form.Field name='icon'>
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Bilet Türü Simgesi *</FieldLabel>
              <TicketTypeIconSelect
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className='text-destructive'>
                  {error?.message}
                </p>
              ))}
            </Field>
          )}
        </form.Field>

        <form.Field name='description'>
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                Bilet Türü Açıklaması
              </FieldLabel>
              <Textarea
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
              className='w-full mt-auto'
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? 'Gönderiliyor...' : 'Bilet Türü Ekle'}
            </Button>
          )}
        </form.Subscribe>
      </FieldSet>
    </form>
  );
}
