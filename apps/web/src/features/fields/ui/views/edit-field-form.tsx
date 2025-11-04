import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { editFieldSchema } from '@/features/fields/schemas';
import FieldTypeSelect from '@/features/fields/ui/components/field-type-select';
import { editFieldMutation } from '@/features/fields/lib/mutations';
import useEditFieldModal from '@/features/fields/hooks/use-edit-field-modal';
import {
  getFieldQuery,
  getFieldTypesQuery,
} from '@/features/fields/lib/queries';
import FieldTypeIconSelect from '@/features/fields/ui/components/field-type-icon-select';
import { Field, FieldLabel, FieldSet } from '@/components/ui/field';

interface EditFieldFormProps {
  fieldId: string;
}

export default function EditFieldForm({ fieldId }: EditFieldFormProps) {
  const createField = useMutation(editFieldMutation);
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
          toast.success('Alan başarıyla düzenlendi');
          form.reset();
          close();
        },
        onError: () => {
          toast.error('Alan düzenlenirken bir hata oluştu');
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
            <Field>
              <FieldLabel htmlFor={field.name}>Alan Adı *</FieldLabel>
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
        <form.Field name='fieldTypeId'>
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Alan Türü *</FieldLabel>
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
              <FieldLabel htmlFor={field.name}>Alan İkonu</FieldLabel>
              <FieldTypeIconSelect
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

        <form.Subscribe>
          {(state) => (
            <Button
              type='submit'
              className='w-full mt-auto'
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? 'Gönderiliyor...' : 'Kaydet'}
            </Button>
          )}
        </form.Subscribe>
      </FieldSet>
    </form>
  );
}
