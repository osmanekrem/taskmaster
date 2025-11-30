import useCustomizeFieldModal from '@/features/ticket-types/hooks/use-customize-field-modal';
import type { FieldWithDefaults, FieldConfig, FieldSelectOption } from '@/types/fields';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import CustomizeFieldFormIssueType from './customize-field-form-issue-type';

// Extended field type that includes issue type specific overrides
interface IssueTypeFieldState extends FieldWithDefaults {
  configOverride?: FieldConfig;
  optionsOverride?: FieldSelectOption[];
}

interface CustomizeFieldModalProps {
  fields: IssueTypeFieldState[];
  onUpdateOverride: (updates: {
    configOverride?: FieldConfig;
    optionsOverride?: FieldSelectOption[];
  }) => void;
}

export default function CustomizeFieldModal({
  fields,
  onUpdateOverride,
}: CustomizeFieldModalProps) {
  const { fieldId, setFieldId } = useCustomizeFieldModal();
  const currentField = fields.find((field) => field.id === fieldId);

  return (
    <Sheet open={!!fieldId} onOpenChange={() => setFieldId('')}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Alan Özelliklerini Özelleştir</SheetTitle>
        </SheetHeader>
        <div className='flex flex-col w-full h-full space-y-4 overflow-y-auto p-4'>
          {currentField && (
            <CustomizeFieldFormIssueType
              field={currentField}
              configOverride={currentField.configOverride}
              optionsOverride={currentField.optionsOverride}
              onUpdateOverride={onUpdateOverride}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
