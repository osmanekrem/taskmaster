import { useState } from 'react';
import FieldSelector from '@/features/fields/ui/components/field-selector';
import TicketTypeCustomize from '@/features/ticket-types/ui/components/ticket-type-customize';
import { Button } from '@/components/ui/button';
import CustomizeFieldModal from '@/features/ticket-types/ui/components/customize-field-modal';
import type { RouterOutput } from '@/utils/trpc';
import type {
  SaveSelectOptionsRequest,
  UpdateFieldOptionValueRequest,
} from '@/features/fields/lib/mutations';
import useCustomizeFieldModal from '../../hooks/use-customize-field-modal';
import { useQuery } from '@tanstack/react-query';
import { getIssueTypeWithDetailsByIssueTypeIdQuery } from '../../lib/queries';
import type { FieldWithDetails } from '@/features/fields/types';

interface TicketTypeFields {
  id: string;
}

type Field = RouterOutput['fields']['getFieldsWithDetails']['data'][number];
type SelectOption = Field['options'][number]['selectOptions'][number];

export default function TicketTypeFields({ id }: TicketTypeFields) {
  const { data } = useQuery(getIssueTypeWithDetailsByIssueTypeIdQuery(id));
  const [fields, setFields] = useState<FieldWithDetails[]>(
    data?.data?.fields ?? [],
  );
  const { fieldId } = useCustomizeFieldModal();

  const saveFields = () => {
    console.log(fields);
  };

  const updateFieldOptionValue = (data: UpdateFieldOptionValueRequest) => {
    setFields((prev) =>
      prev.map((field) => {
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
      }),
    );
  };

  const saveSelectOptions = (data: SaveSelectOptionsRequest) => {
    setFields((prev) =>
      prev.map((field) => {
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
      }),
    );
  };

  return (
    <div className='flex w-full flex-1 min-h-0 gap-2.5 border-t pt-4'>
      <CustomizeFieldModal
        fields={fields}
        updateFieldOptionValue={updateFieldOptionValue}
        saveSelectOptions={saveSelectOptions}
      />
      <div className='flex flex-col flex-1 min-w-0 space-y-4 '>
        <div className='flex flex-col flex-1 min-h-0 space-y-4 overflow-y-auto border border-border rounded-md'>
          <TicketTypeCustomize fields={fields} setFields={setFields} id={id} />
        </div>
        <Button onClick={saveFields}>Kaydet</Button>
      </div>
      <div className='flex flex-col min-w-0 w-full max-w-xs space-y-4'>
        <h2 className='text-xl font-bold leading-tight truncate'>Alanlar</h2>
        <FieldSelector fields={fields} setFields={setFields} />
      </div>
    </div>
  );
}
