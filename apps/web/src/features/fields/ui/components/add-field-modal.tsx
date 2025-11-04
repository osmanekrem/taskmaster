import ResponsiveModal from '@/components/responsive-modal';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import useAddFieldModal from '@/features/fields/hooks/use-add-field-modal';
import AddFieldForm from '@/features/fields/ui/views/add-field-form';

export default function AddFieldModal() {
  const { isOpen, setIsOpen } = useAddFieldModal();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Alan Ekle</SheetTitle>
        </SheetHeader>
        <AddFieldForm />
      </SheetContent>
    </Sheet>
  );
}
