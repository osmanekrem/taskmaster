import { useDeleteFieldMutation } from '../../lib/mutations';
import { Button } from '@/components/ui/button';
import { TrashIcon } from 'lucide-react';
import useConfirm from '@/hooks/use-confirm';
import { useNavigate } from '@tanstack/react-router';

interface DeleteFieldButtonProps {
  id: string;
}

export default function DeleteFieldButton({ id }: DeleteFieldButtonProps) {
  const navigate = useNavigate();
  const deleteTicketType = useDeleteFieldMutation();
  const [DeleteConfirmDialog, confirmDelete] = useConfirm(
    'Silme Onayı',
    'Bu alanı silmek istediğinize emin misiniz?',
    'Sil',
  );
  const handleDelete = async () => {
    const confirmed = await confirmDelete();
    if (confirmed) {
      deleteTicketType.mutate(
        { fieldId: id },
        {
          onSuccess: () => {
            navigate({ to: '/admin-settings/fields', replace: true });
          },
        },
      );
    }
  };
  return (
    <>
      <DeleteConfirmDialog />
      <Button variant='destructive' onClick={handleDelete}>
        <TrashIcon className='size-4' />
        Sil
      </Button>
    </>
  );
}
