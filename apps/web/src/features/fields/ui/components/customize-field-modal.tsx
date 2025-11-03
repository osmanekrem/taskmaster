import ResponsiveModal from '@/components/responsive-modal';
import useCustomizeFieldModal from '@/features/ticket-types/hooks/use-customize-field-modal';
import CustomizeFieldForm from '../views/customize-field-form';
import { useQuery } from '@tanstack/react-query';
import { getFieldWithDetailsQuery } from '../../lib/queries';

interface CustomizeFieldModalProps {
  updateFieldOptionValue: (data: any) => void;
  saveSelectOptions: (data: any) => void;
}

export default function CustomizeFieldModal({
  updateFieldOptionValue,
  saveSelectOptions,
}: CustomizeFieldModalProps) {
  const { fieldId, setFieldId } = useCustomizeFieldModal();

  const { data } = useQuery(getFieldWithDetailsQuery(fieldId ?? ''));
  return (
    <ResponsiveModal open={!!fieldId} onOpenChange={() => setFieldId('')}>
      <div className='flex flex-col w-full h-full space-y-4 overflow-y-auto p-4'>
        <CustomizeFieldForm
          options={data?.data?.options}
          updateFieldOptionValue={updateFieldOptionValue}
          saveSelectOptions={saveSelectOptions}
        />
      </div>
    </ResponsiveModal>
  );
}
