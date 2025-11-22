import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { editFieldSchema } from '@/features/fields/schemas';
import FieldTypeSelect from '@/features/fields/ui/components/field-type-select';
import { useEditFieldMutation } from '@/features/fields/lib/mutations';
import useEditFieldModal from '@/features/fields/hooks/use-edit-field-modal';
import {
  getFieldQuery,
  getFieldTypesQuery,
} from '@/features/fields/lib/queries';
import FieldTypeIconSelect from '@/features/fields/ui/components/field-type-icon-select';
import { FieldSet } from '@/components/ui/field';
import { FormField } from '@/components/form-elements/form-field';
import { FormSubmitButton } from '@/components/form-elements/submit-button';

interface EditFieldFormProps {
  readonly fieldId: string;
}

export default function EditFieldForm({ fieldId }: Readonly<EditFieldFormProps>) {
  const createField = useEditFieldMutation();
  const { data } = useQuery(getFieldQuery(fieldId));
  const { data: fieldTypes } = useQuery(getFieldTypesQuery);
  const { close } = useEditFieldModal();
  const form = useForm({
    defaultValues: {
      fieldId: fieldId,
      name: data?.data?.name ?? '',
      icon: data?.data?.icon ?? '',
      fieldTypeId: data?.data?.fieldTypeId ?? '',
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
      onSubmit: editFieldSchema,
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
            <FormField field={field} label='Alan Adı *'>
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
          label='Kaydet'
          submittingLabel='Gönderiliyor...'
          className='w-full mt-auto'
        />
      </FieldSet>
    </form>
  );
}
