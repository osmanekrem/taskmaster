import ResponsiveModal from '@/components/responsive-modal';
import useEditFieldModal from '@/features/fields/hooks/use-edit-field-modal';
import EditFieldForm from '@/features/fields/ui/views/edit-field-form';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function EditFieldModal() {
  const { fieldId, setFieldId } = useEditFieldModal();

  if (!fieldId) return null;

  return (
    <Sheet
      open={!!fieldId}
      onOpenChange={() => {
        setFieldId('');
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Alan Düzenle</SheetTitle>
        </SheetHeader>
        <EditFieldForm fieldId={fieldId} />
      </SheetContent>
    </Sheet>
  );
}
