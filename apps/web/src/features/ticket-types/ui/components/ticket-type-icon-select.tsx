import {
    Select,
    SelectItem,
    SelectContent,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import TicketTypeIcon from "./ticket-type-icon";
import {ticketTypeIcons} from "../../constants/icons";

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
                {ticketTypeIcons.map(({name}) => (
                    <SelectItem key={name} value={name}>
                        <TicketTypeIcon name={name}/>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
