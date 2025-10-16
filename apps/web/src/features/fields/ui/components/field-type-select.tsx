import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ticketTypeIcons} from "@/features/ticket-types/constants/icons";
import TicketTypeIcon from "@/features/ticket-types/ui/components/ticket-type-icon";
import {useQuery} from "@tanstack/react-query";
import {getFieldTypesQuery} from "@/features/fields/lib/queries";
import FieldTypeIcon from "@/features/fields/ui/components/field-type-icon";

interface FieldTypeSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export default function FieldTypeSelect({value, onChange}: FieldTypeSelectProps) {
    const {data: fieldTypes} = useQuery(getFieldTypesQuery);

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full">
                <SelectValue
                    className="flex items-center gap-2 w-full"
                    placeholder="Alan tipi seç"
                />
            </SelectTrigger>
            <SelectContent>
                {fieldTypes?.data.map((fieldType) => (
                    <SelectItem key={fieldType.id} value={fieldType.id}>
                        <FieldTypeIcon name={fieldType.icon ?? ""}/>
                        {fieldType.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}