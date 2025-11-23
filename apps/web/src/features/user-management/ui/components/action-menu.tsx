import type { User } from '@/lib/auth-client';
import { toast } from 'sonner';
import useConfirm from '@/hooks/use-confirm';
import { useDeleteUser } from '@/features/user-management/lib/api';
import {
  type RowAction,
  RowActions,
  type Row,
} from 'tanstack-shadcn-table/table-elements';
import { useMemo } from 'react';
import { CopyIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface Props {
  row: Row<User>;
}

export default function ActionMenu({ row }: Props) {
  const navigate = useNavigate();
  const [DeleteConfirmDialog, confirmDelete] = useConfirm(
    'Silme Onayı',
    'Bu kullanıcıyı silmek istediğinize emin misiniz?',
    'Sil',
  );

  const deleteUser = useDeleteUser(row.original.id);
  const copyIdToClipboard = () => {
    navigator.clipboard.writeText(row.original.id);
    toast.success('ID panoya kopyalandı!');
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete();
    if (confirmed) {
      await deleteUser.mutateAsync();
    }
  };

  const actions: RowAction<User>[] = useMemo(
    () => [
      {
        id: 'copy-id',
        label: "ID'yi kopyala",
        icon: CopyIcon,
        onClick: () => copyIdToClipboard(),
      },
      {
        separator: true,
        id: 'edit',
        label: 'Düzenle',
        icon: PencilIcon,
        onClick: () => {
          navigate({
            to: '/user-management/edit-user/$id',
            params: { id: row.original.id },
          });
        },
      },
      {
        id: 'delete',
        label: 'Sil',
        icon: TrashIcon,
        destructive: true,
        onClick: () => handleDelete(),
      },
    ],
    [],
  );

  return (
    <>
      <RowActions row={row} actions={actions} align='start' />
      <DeleteConfirmDialog />
    </>
  );
}
