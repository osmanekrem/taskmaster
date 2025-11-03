import { useState } from 'react';
import FieldSelector from '@/features/fields/ui/components/field-selector';
import TicketTypePreview from '@/features/ticket-types/ui/components/ticket-type-preview';
import TicketTypeCustomize from '@/features/ticket-types/ui/components/ticket-type-customize';
import { Button } from '@/components/ui/button';
import { EyeIcon, PencilIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomizeFieldModal from '@/features/fields/ui/components/customize-field-modal';
import type { RouterOutput } from '@/utils/trpc';
import type {
  SaveSelectOptionsRequest,
  UpdateFieldOptionValueRequest,
} from '@/features/fields/lib/mutations';
import useCustomizeFieldModal from '../../hooks/use-customize-field-modal';

interface TicketTypeFields {
  id: string;
}

type Field = RouterOutput['fields']['getFieldsWithDetails']['data'][number];
type SelectOption = Field['options'][number]['selectOptions'][number];

export default function TicketTypeFields({ id }: TicketTypeFields) {
  const [fields, setFields] = useState<Field[]>([]);
  const [mode, setMode] = useState<'preview' | 'customize'>('customize');
  const { fieldId } = useCustomizeFieldModal();

  const updateFieldOptionValue = (data: UpdateFieldOptionValueRequest) => {
    const fieldsUpdated = fields.map((field) => {
      if (field.id === fieldId) {
        return {
          ...field,
          options: field.options.map((option) =>
            option.id === data.fieldOptionId
              ? { ...option, value: data.value }
              : option,
          ),
        };
      }
      return field;
    });
    setFields([...fieldsUpdated]);
  };

  const saveSelectOptions = (data: SaveSelectOptionsRequest) => {
    const fieldsUpdated = fields.map((field) => {
      if (field.id === fieldId) {
        return {
          ...field,
          options: field.options.map((option) => {
            if (option.id === data.fieldOptionId) {
              return {
                ...option,
                selectOptions: data.options as SelectOption[],
              };
            }
            return option;
          }),
        };
      }
      return field;
    });
    setFields([...fieldsUpdated]);
  };

  return (
    <div className='flex w-full flex-1 min-h-0 gap-2.5 border-t pt-4'>
      <CustomizeFieldModal
        updateFieldOptionValue={updateFieldOptionValue}
        saveSelectOptions={saveSelectOptions}
      />
      <div className='flex flex-col flex-1 min-w-0 space-y-4'>
        <div className='grid grid-cols-2 gap-2'>
          <Button
            variant='outline'
            className={cn(
              mode === 'preview' && '!bg-primary !text-primary-foreground',
            )}
            onClick={() => setMode('preview')}
          >
            <EyeIcon className='size-4' />
            Önizleme
          </Button>
          <Button
            variant='outline'
            className={cn(
              mode === 'customize' && '!bg-primary !text-primary-foreground',
            )}
            onClick={() => setMode('customize')}
          >
            <PencilIcon className='size-4' />
            Özelleştir
          </Button>
        </div>
        <div className='flex-1 min-h-0 border border-border rounded-md'>
          {mode === 'preview' ? (
            <TicketTypePreview fields={fields} />
          ) : (
            <TicketTypeCustomize
              fields={fields}
              setFields={setFields}
              id={id}
            />
          )}
        </div>
      </div>
      <div className='flex flex-col min-w-0 w-full max-w-xs space-y-4'>
        <h2 className='text-xl font-bold leading-tight truncate'>Alanlar</h2>
        <FieldSelector fields={fields} setFields={setFields} />
      </div>
    </div>
  );
}
