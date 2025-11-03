import { useParams } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { PencilIcon } from 'lucide-react';
import useEditFieldModal from '@/features/fields/hooks/use-edit-field-modal';
import EditFieldModal from '@/features/fields/ui/components/edit-field-modal';
import DeleteFieldButton from '@/features/fields/ui/components/delete-field-button';
import { Route } from '@/routes/__protected/__admin/admin-settings/fields/$id';
import { getFieldWithDetailsQuery } from '@/features/fields/lib/queries';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  saveSelectOptionsMutation,
  updateFieldOptionValueMutation,
} from '@/features/fields/lib/mutations';
import { Icon } from '@/components/ui/icon-picker';
import type { IconName } from 'lucide-react/dynamic';
import CustomizeFieldForm from './customize-field-form';

export default function FieldDetail() {
  const { id } = useParams({ from: Route.id });
  const { data } = useQuery(getFieldWithDetailsQuery(id));
  const { open } = useEditFieldModal();
  const { mutate: saveSelectOptions } = useMutation(saveSelectOptionsMutation);
  const { mutate: updateFieldOptionValue } = useMutation(
    updateFieldOptionValueMutation,
  );

  return (
    <div className='flex flex-col w-full h-full space-y-4'>
      <EditFieldModal />
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-bold leading-tight flex items-center gap-2 truncate'>
          <Icon name={(data?.data?.icon as IconName) ?? ''} />
          {data?.data?.name}
        </h2>

        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => open(id)}>
            <PencilIcon className='size-4' />
            Düzenle
          </Button>
          <DeleteFieldButton id={id} />
        </div>
      </div>
      <div className='flex flex-col w-full flex-1 min-h-0 space-y-4 overflow-y-auto'>
        <CustomizeFieldForm
          options={data?.data?.options}
          updateFieldOptionValue={updateFieldOptionValue}
          saveSelectOptions={saveSelectOptions}
        />
      </div>
    </div>
  );
}
