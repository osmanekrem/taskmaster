import { useForm } from '@tanstack/react-form';
import { editTicketTypeSchema } from '@/features/ticket-types/schemas';
import { editTicketTypeMutation } from '@/features/ticket-types/lib/mutations';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import TicketTypeIconSelect from '../components/ticket-type-icon-select';
import { getTicketTypeQuery } from '../../lib/queries';
import useEditTicketTypeModal from '@/features/ticket-types/hooks/use-edit-ticket-type-modal';
import { Field, FieldLabel, FieldSet } from '@/components/ui/field';

interface EditTicketTypeFormProps {
  ticketTypeId: string;
}

export default function EditTicketTypeForm({
  ticketTypeId,
}: EditTicketTypeFormProps) {
  const { data } = useQuery(getTicketTypeQuery(ticketTypeId ?? ''));
  const editTicketType = useMutation(editTicketTypeMutation);
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
            toast.success('Bilet türü başarıyla düzenlendi');
            form.reset();
            close();
          },
          onError: () => {
            toast.error('Bilet türü düzenlenirken bir hata oluştu');
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
            <Field>
              <FieldLabel htmlFor={field.name}>Bilet Türü Adı</FieldLabel>
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
              <FieldLabel htmlFor={field.name}>Bilet Türü Simgesi</FieldLabel>
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
              {state.isSubmitting ? 'Gönderiliyor...' : 'Bilet Türü Düzenle'}
            </Button>
          )}
        </form.Subscribe>
      </FieldSet>
    </form>
  );
}
