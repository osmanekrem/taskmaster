import useEditTicketTypeModal from '@/features/ticket-types/hooks/use-edit-ticket-type-modal';
import EditTicketTypeForm from '../views/edit-ticket-type-form';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function EditTicketTypeModal() {
  const { ticketTypeId, setTicketTypeId } = useEditTicketTypeModal();

  if (!ticketTypeId) return null;

  return (
    <Sheet
      open={!!ticketTypeId}
      onOpenChange={() => {
        setTicketTypeId('');
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Bilet Türü Düzenle</SheetTitle>
        </SheetHeader>
        <EditTicketTypeForm ticketTypeId={ticketTypeId} />
      </SheetContent>
    </Sheet>
  );
}
