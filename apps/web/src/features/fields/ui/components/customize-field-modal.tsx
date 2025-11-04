import ResponsiveModal from '@/components/responsive-modal';
import useCustomizeFieldModal from '@/features/ticket-types/hooks/use-customize-field-modal';
import CustomizeFieldForm from '../views/customize-field-form';
import { useQuery } from '@tanstack/react-query';
import { getFieldWithDetailsQuery } from '../../lib/queries';
import type { IssueTypeFieldWithDetails } from '../../types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import CustomizeFieldFormIssueType from '../views/customize-field-form-issue-type';

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
