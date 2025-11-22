import { useForm } from '@tanstack/react-form';
import { createTicketTypeSchema } from '@/features/ticket-types/schemas';
import { useCreateTicketTypeMutation } from '@/features/ticket-types/lib/mutations';
import { Input } from '@/components/ui/input';
import TicketTypeIconSelect from '../components/ticket-type-icon-select';
import useAddTicketTypeModal from '@/features/ticket-types/hooks/use-add-ticket-type-modal';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-elements/form-field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';
import { TextareaField } from '@/components/form-elements/textarea-field';

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
            <FormField field={field} label='Bilet Türü Adı *'>
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

        <form.Field name='icon'>
          {(field) => (
            <FormField field={field} label='Bilet Türü Simgesi *'>
              <TicketTypeIconSelect
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name='description'>
          {(field) => (
            <TextareaField field={field} label='Bilet Türü Açıklaması' />
          )}
        </form.Field>

        <FormSubmitButton
          form={form}
          label='Bilet Türü Ekle'
          submittingLabel='Gönderiliyor...'
          className='w-full mt-auto'
        />
      </FieldSet>
    </form>
  );
}
