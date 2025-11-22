import { useForm } from '@tanstack/react-form';
import { editTicketTypeSchema } from '@/features/ticket-types/schemas';
import { useEditTicketTypeMutation } from '@/features/ticket-types/lib/mutations';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import TicketTypeIconSelect from '../components/ticket-type-icon-select';
import { getTicketTypeQuery } from '../../lib/queries';
import useEditTicketTypeModal from '@/features/ticket-types/hooks/use-edit-ticket-type-modal';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-elements/form-field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';
import { TextareaField } from '@/components/form-elements/textarea-field';

interface EditTicketTypeFormProps {
  readonly ticketTypeId: string;
}

export default function EditTicketTypeForm({
  ticketTypeId,
}: Readonly<EditTicketTypeFormProps>) {
  const { data } = useQuery(getTicketTypeQuery(ticketTypeId ?? ''));
  const editTicketType = useEditTicketTypeMutation();
  const { close } = useEditTicketTypeModal();
  const form = useForm({
    defaultValues: {
      ticketTypeId: ticketTypeId ?? '',
      name: data?.data?.name ?? '',
      description: data?.data?.description ?? '',
      icon: data?.data?.icon ?? '',
    },
    onSubmit: async ({ value }) => {
      if (!ticketTypeId) return;
      await editTicketType.mutateAsync(
        { ...value, ticketTypeId },
        {
          onSuccess: () => {
            form.reset();
            close();
          },
        },
      );
    },
    validators: {
      onSubmit: editTicketTypeSchema,
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
            <FormField field={field} label='Bilet Türü Adı'>
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
            <FormField field={field} label='Bilet Türü Simgesi'>
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
          label='Bilet Türü Düzenle'
          submittingLabel='Gönderiliyor...'
          className='w-full mt-auto'
        />
      </FieldSet>
    </form>
  );
}
