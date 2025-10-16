import ResponsiveModal from "@/components/responsive-modal";
import useEditTicketTypeModal from "@/features/ticket-types/hooks/use-edit-ticket-type-modal";
import EditTicketTypeForm from "../views/edit-ticket-type-form";

export default function EditTicketTypeModal() {
  const { ticketTypeId, setTicketTypeId } = useEditTicketTypeModal();

  if (!ticketTypeId) return null;

  return (
    <ResponsiveModal
      open={!!ticketTypeId}
      onOpenChange={() => {
        setTicketTypeId("");
      }}
    >
      <EditTicketTypeForm ticketTypeId={ticketTypeId} />
    </ResponsiveModal>
  );
}
