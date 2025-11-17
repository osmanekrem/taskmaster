import { useDeleteTicketTypeMutation } from '../../lib/mutations';
import { Button } from '@/components/ui/button';
import { TrashIcon } from 'lucide-react';
import useConfirm from '@/hooks/use-confirm';
import { useNavigate } from '@tanstack/react-router';

interface DeleteTicketTypeButtonProps {
  id: string;
}

export default function DeleteTicketTypeButton({
  id,
}: DeleteTicketTypeButtonProps) {
  const navigate = useNavigate();
  const deleteTicketType = useDeleteTicketTypeMutation();
  const [DeleteConfirmDialog, confirmDelete] = useConfirm(
    'Silme Onayı',
    'Bu bilet türünü silmek istediğinize emin misiniz?',
    'Sil',
  );
  const handleDelete = async () => {
    const confirmed = await confirmDelete();
    if (confirmed) {
      deleteTicketType.mutate(
        { ticketTypeId: id },
        {
          onSuccess: () => {
            navigate({ to: '/admin-settings/ticket-types', replace: true });
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
