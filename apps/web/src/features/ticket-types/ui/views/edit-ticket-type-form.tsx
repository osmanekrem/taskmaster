import { useForm } from '@tanstack/react-form';
import { editTicketTypeSchema } from '@/features/ticket-types/schemas';
import { useEditTicketTypeMutation } from '@/features/ticket-types/lib/mutations';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import TicketTypeIconSelect from '../components/ticket-type-icon-select';
import { getTicketTypeQuery } from '../../lib/queries';
import useEditTicketTypeModal from '@/features/ticket-types/hooks/use-edit-ticket-type-modal';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-field';

interface EditTicketTypeFormProps {
  ticketTypeId: string;
}

export default function EditTicketTypeForm({
  ticketTypeId,
}: EditTicketTypeFormProps) {
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
            <FormField field={field} label='Bilet Türü Açıklaması'>
              <Textarea
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
              {state.isSubmitting ? 'Gönderiliyor...' : 'Bilet Türü Düzenle'}
            </Button>
          )}
        </form.Subscribe>
      </FieldSet>
    </form>
  );
}
