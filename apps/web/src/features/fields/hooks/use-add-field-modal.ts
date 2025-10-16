import {parseAsBoolean, useQueryState} from "nuqs";

export default function useAddFieldModal() {
    const [isOpen, setIsOpen] = useQueryState(
        "add-field-modal",
        parseAsBoolean.withDefault(false).withOptions({clearOnDefault: true})
    );

    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    return {isOpen, open, close, setIsOpen};
}
