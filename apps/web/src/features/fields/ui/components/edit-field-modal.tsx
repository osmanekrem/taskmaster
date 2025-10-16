import ResponsiveModal from "@/components/responsive-modal";
import useEditFieldModal from "@/features/fields/hooks/use-edit-field-modal";
import EditFieldForm from "@/features/fields/ui/views/edit-field-form";

export default function EditFieldModal() {
    const {fieldId, setFieldId} = useEditFieldModal();

    if (!fieldId) return null;

    return (
        <ResponsiveModal
            open={!!fieldId}
            onOpenChange={() => {
                setFieldId("");
            }}
        >
            <EditFieldForm fieldId={fieldId}/>
        </ResponsiveModal>
    );
}
