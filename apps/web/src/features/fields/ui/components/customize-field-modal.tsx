import ResponsiveModal from '@/components/responsive-modal';
import useCustomizeFieldModal from '@/features/ticket-types/hooks/use-customize-field-modal';
import CustomizeFieldForm from '../views/customize-field-form';
import { useQuery } from '@tanstack/react-query';
import { getFieldWithDetailsQuery } from '../../lib/queries';
import type { FieldWithDetails } from '../../types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface CustomizeFieldModalProps {
  updateFieldOptionValue: (data: any) => void;
  saveSelectOptions: (data: any) => void;
  fields: FieldWithDetails[];
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
          <CustomizeFieldForm
            options={fields.find((field) => field.id === fieldId)?.options}
            updateFieldOptionValue={updateFieldOptionValue}
            saveSelectOptions={saveSelectOptions}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
