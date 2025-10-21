import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ticketTypeIcons} from "@/features/ticket-types/constants/icons";
import TicketTypeIcon from "@/features/ticket-types/ui/components/ticket-type-icon";
import {useQuery} from "@tanstack/react-query";
import {getFieldTypesQuery} from "@/features/fields/lib/queries";
import FieldTypeIcon from "@/features/fields/ui/components/field-type-icon";
import {fieldTypeIcons} from "@/features/fields/constants/icons";

interface FieldTypeIconSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export default function FieldTypeIconSelect({value, onChange}: FieldTypeIconSelectProps) {

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full">
                <SelectValue
                    className="flex items-center gap-2 w-full"
                    placeholder="Alan ikonu seç"
                />
            </SelectTrigger>
            <SelectContent>
                {fieldTypeIcons?.map((icon) => (
                    <SelectItem key={icon.name} value={icon.name}>
                        <FieldTypeIcon name={icon.name ?? ""}/>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}