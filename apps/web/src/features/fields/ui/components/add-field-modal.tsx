import ResponsiveModal from "@/components/responsive-modal";
import useAddFieldModal from "@/features/fields/hooks/use-add-field-modal";
import AddFieldForm from "@/features/fields/ui/views/add-field-form";

export default function AddFieldModal() {
    const {isOpen, setIsOpen} = useAddFieldModal();

    return (
        <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
            <AddFieldForm/>
        </ResponsiveModal>
    );
}
