import AddTicketTypeForm from "../views/add-ticket-type-form";
import ResponsiveModal from "@/components/responsive-modal";
import useAddTicketTypeModal from "@/features/ticket-types/hooks/use-add-ticket-type-modal";

export default function AddTicketTypeModal() {
  const { isOpen, setIsOpen } = useAddTicketTypeModal();

  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
      <AddTicketTypeForm />
    </ResponsiveModal>
  );
}
