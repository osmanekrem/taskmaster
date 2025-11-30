import { useState, useEffect, useCallback } from 'react';
import FieldSelector from '@/features/fields/ui/components/field-selector';
import TicketTypeCustomize from '@/features/ticket-types/ui/components/ticket-type-customize';
import { Button } from '@/components/ui/button';
import CustomizeFieldModal from '@/features/ticket-types/ui/components/customize-field-modal';
import useCustomizeFieldModal from '../../hooks/use-customize-field-modal';
import { useQuery } from '@tanstack/react-query';
import { getIssueTypeWithDetailsByIssueTypeIdQuery } from '../../lib/queries';
import type { FieldWithDefaults, FieldConfig, FieldSelectOption } from '@/types/fields';
import { useSaveIssueTypeFieldsMutation } from '../../lib/mutations';

interface TicketTypeFieldsProps {
  id: string;
}

// Extended field type that includes issue type specific overrides
interface IssueTypeFieldState extends FieldWithDefaults {
  configOverride?: FieldConfig;
  optionsOverride?: FieldSelectOption[];
}

export default function TicketTypeFields({ id }: Readonly<TicketTypeFieldsProps>) {
  const { data } = useQuery(getIssueTypeWithDetailsByIssueTypeIdQuery(id));
  const [fields, setFields] = useState<IssueTypeFieldState[]>([]);

  useEffect(() => {
    if (data?.data?.fields) {
      // Map the API response to our state structure
      setFields(
        data.data.fields.map((f) => ({
          id: f.id,
          name: f.name,
          icon: f.icon,
          fieldType: f.fieldType,
          config: (f.config as FieldConfig) ?? {},
          options: (f.options as FieldSelectOption[]) ?? [],
          configOverride: (f.configOverride as FieldConfig) ?? undefined,
          optionsOverride: (f.optionsOverride as FieldSelectOption[]) ?? undefined,
          createdAt: f.createdAt ?? null,
          updatedAt: f.updatedAt ?? null,
        })),
      );
    }
  }, [data]);

  const { fieldId } = useCustomizeFieldModal();
  const { mutate: saveFieldsMutation } = useSaveIssueTypeFieldsMutation();

  const saveFields = () => {
    saveFieldsMutation({
      issueTypeId: id,
      fields: fields.map((field) => ({
        fieldId: field.id,
        order: fields.indexOf(field),
        configOverride: field.configOverride,
        optionsOverride: field.optionsOverride,
      })),
    });
  };

  const updateFieldOverride = useCallback(
    (updates: { configOverride?: FieldConfig; optionsOverride?: FieldSelectOption[] }) => {
      if (!fieldId) return;
      setFields((prev) =>
        prev.map((field) => {
          if (field.id === fieldId) {
            return {
              ...field,
              ...updates,
            };
          }
          return field;
        }),
      );
    },
    [fieldId],
  );

  // Handler for adding/removing fields from selector
  const handleSetFields = useCallback((newFieldsOrUpdater: React.SetStateAction<FieldWithDefaults[]>) => {
    setFields((prev) => {
      const newFields = typeof newFieldsOrUpdater === 'function'
        ? newFieldsOrUpdater(prev)
        : newFieldsOrUpdater;

      // Merge with existing state to preserve overrides
      return newFields.map((newField) => {
        const existing = prev.find((f) => f.id === newField.id);
        if (existing) {
          return existing;
        }
        return {
          ...newField,
          configOverride: undefined,
          optionsOverride: undefined,
        };
      });
    });
  }, []);

  return (
    <div className='flex w-full flex-1 min-h-0 gap-2.5 border-t pt-4'>
      <CustomizeFieldModal
        fields={fields}
        onUpdateOverride={updateFieldOverride}
      />
      <div className='flex flex-col flex-1 min-w-0 space-y-4 '>
        <div className='flex flex-col flex-1 min-h-0 space-y-4 overflow-y-auto border border-border rounded-md'>
          <TicketTypeCustomize fields={fields} setFields={setFields} id={id} />
        </div>
        <Button onClick={saveFields}>Kaydet</Button>
      </div>
      <div className='flex flex-col max-w-64 w-full space-y-4'>
        <h2 className='text-xl font-bold leading-tight truncate'>Alanlar</h2>
        <FieldSelector fields={fields} setFields={handleSetFields} />
      </div>
    </div>
  );
}
