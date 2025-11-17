import useCustomizeFieldModal from '@/features/ticket-types/hooks/use-customize-field-modal';
import type { IssueTypeFieldWithDetails } from '../../../fields/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import CustomizeFieldFormIssueType from './customize-field-form-issue-type';

interface CustomizeFieldModalProps {
  updateFieldOptionValue: (data: any) => void;
  saveSelectOptions: (data: any) => void;
  fields: IssueTypeFieldWithDetails[];
}

export default function CustomizeFieldModal({
  fields,
  updateFieldOptionValue,
  saveSelectOptions,
}: CustomizeFieldModalProps) {
  const { fieldId, setFieldId } = useCustomizeFieldModal();
  return (
    <Sheet open={!!fieldId} onOpenChange={() => setFieldId('')}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Alan Özelliklerini Özelleştir</SheetTitle>
        </SheetHeader>
        <div className='flex flex-col w-full h-full space-y-4 overflow-y-auto p-4'>
          <CustomizeFieldFormIssueType
            options={fields.find((field) => field.id === fieldId)?.fieldOptions}
            updateFieldOptionValue={updateFieldOptionValue}
            saveSelectOptions={saveSelectOptions}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
