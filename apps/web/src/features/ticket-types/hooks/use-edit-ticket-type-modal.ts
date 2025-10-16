import { parseAsString, useQueryState } from "nuqs";

export default function useEditTicketTypeModal() {
  const [ticketTypeId, setTicketTypeId] = useQueryState(
    "edit-ticket-type-modal",
    parseAsString.withOptions({ clearOnDefault: true })
  );

  const open = (ticketTypeId: string) => setTicketTypeId(ticketTypeId);
  const close = () => setTicketTypeId("");
  return { ticketTypeId, open, close, setTicketTypeId };
}
