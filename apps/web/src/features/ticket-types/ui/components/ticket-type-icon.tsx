import { ticketTypeIcons } from "../../constants/icons";

interface TicketTypeIconProps {
  name: string;
}
export default function TicketTypeIcon({ name }: TicketTypeIconProps) {
  const icon = ticketTypeIcons.find((i) => i.name === name);
  if (!icon) return null;
  return <icon.icon className="size-4" />;
}
