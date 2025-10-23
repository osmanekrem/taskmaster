import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ticketTypeIcons } from "../../constants/icons";
import { Icon, type IconName } from "@/components/ui/icon-picker";

interface TicketTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TicketTypeIconSelect({
  value,
  onChange,
}: TicketTypeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue
          className="flex items-center gap-2 w-full"
          placeholder="İkon seç"
        />
      </SelectTrigger>
      <SelectContent>
        {ticketTypeIcons.map(({ name }) => (
          <SelectItem key={name} value={name}>
            <Icon name={name as IconName} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
