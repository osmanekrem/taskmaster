import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { createFieldSchema } from '@taskmaster/validation';
import FieldTypeSelect from '@/features/fields/ui/components/field-type-select';
import { useCreateFieldMutation } from '@/features/fields/lib/mutations';
import useAddFieldModal from '@/features/fields/hooks/use-add-field-modal';
import FieldTypeIconSelect from '@/features/fields/ui/components/field-type-icon-select';
import { getFieldTypesQuery } from '@/features/fields/lib/queries';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-elements/form-field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';
import { TextField } from '@/components/form-elements/text-field';

export default function AddFieldForm() {
  const createField = useCreateFieldMutation();
  const { data: fieldTypes } = useQuery(getFieldTypesQuery);
  const { close } = useAddFieldModal();
  const form = useForm({
    defaultValues: {
      name: '',
      icon: '',
      fieldTypeId: '',
    },
    onSubmit: async ({ value }) => {
      await createField.mutateAsync(value, {
        onSuccess: () => {
          form.reset();
          close();
        },
      });
    },
    validators: {
      onSubmit: createFieldSchema,
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className='space-y-4 p-4 w-full h-full'
    >
      <FieldSet className='flex flex-col h-full'>
        <form.Field name='name'>
          {(field) => <TextField field={field} label='Alan Adı *' />}
        </form.Field>
        <form.Field name='fieldTypeId'>
          {(field) => (
            <FormField field={field} label='Alan Türü *'>
              <FieldTypeSelect
                value={field.state.value}
                onChange={(value) => {
                  field.handleChange(value);
                  const selectedFieldType = fieldTypes?.data.find(
                    (ft) => ft.id === value,
                  );
                  form.setFieldValue('icon', selectedFieldType?.icon || '');
                }}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name='icon'>
          {(field) => (
            <FormField field={field} label='Alan İkonu'>
              <FieldTypeIconSelect
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
              />
            </FormField>
          )}
        </form.Field>

        <FormSubmitButton
          form={form}
          label='Alan Ekle'
          submittingLabel='Gönderiliyor...'
          className='w-full mt-auto'
        />
      </FieldSet>
    </form>
  );
}
