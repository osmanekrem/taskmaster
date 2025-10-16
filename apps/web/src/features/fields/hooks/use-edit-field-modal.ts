import {parseAsString, useQueryState} from "nuqs";

export default function useEditFieldModal() {
    const [fieldId, setFieldId] = useQueryState(
        "edit-field-modal",
        parseAsString.withOptions({clearOnDefault: true})
    );

    const open = (fieldId: string) => setFieldId(fieldId);
    const close = () => setFieldId("");
    return {fieldId, open, close, setFieldId};
}
