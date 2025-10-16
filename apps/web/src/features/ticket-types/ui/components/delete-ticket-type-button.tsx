import { useMutation } from "@tanstack/react-query";
import { deleteTicketTypeMutation } from "../../lib/mutations";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "lucide-react";
import useConfirm from "@/hooks/use-confirm";
import { redirect, useNavigate } from "@tanstack/react-router";

interface DeleteTicketTypeButtonProps {
  id: string;
}

export default function DeleteTicketTypeButton({
  id,
}: DeleteTicketTypeButtonProps) {
  const navigate = useNavigate();
  const deleteTicketType = useMutation(deleteTicketTypeMutation);
  const [DeleteConfirmDialog, confirmDelete] = useConfirm(
    "Silme Onayı",
    "Bu bilet türünü silmek istediğinize emin misiniz?",
    "Sil"
  );
  const handleDelete = async () => {
    const confirmed = await confirmDelete();
    if (confirmed) {
      deleteTicketType.mutate(
        { ticketTypeId: id },
        {
          onSuccess: () => {
            navigate({ to: "/settings/ticket-types", replace: true });
          },
        }
      );
    }
  };
  return (
    <>
      <DeleteConfirmDialog />
      <Button variant="destructive" onClick={handleDelete}>
        <TrashIcon className="size-4" />
        Sil
      </Button>
    </>
  );
}
