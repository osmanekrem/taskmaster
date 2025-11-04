import AddTicketTypeForm from '../views/add-ticket-type-form';
import useAddTicketTypeModal from '@/features/ticket-types/hooks/use-add-ticket-type-modal';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
export default function AddTicketTypeModal() {
  const { isOpen, setIsOpen } = useAddTicketTypeModal();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Bilet Türü Ekle</SheetTitle>
        </SheetHeader>
        <AddTicketTypeForm />
      </SheetContent>
    </Sheet>
  );
}
