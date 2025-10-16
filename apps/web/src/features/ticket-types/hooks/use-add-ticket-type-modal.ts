import { parseAsBoolean, useQueryState } from "nuqs";

export default function useAddTicketTypeModal() {
  const [isOpen, setIsOpen] = useQueryState(
    "add-ticket-type-modal",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
  );

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  return { isOpen, open, close, setIsOpen };
}
