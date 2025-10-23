import type {FieldWithDetails} from "@/features/fields/types";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Icon} from "@/components/ui/icon-picker";
import type {IconName} from "lucide-react/dynamic";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {DatePicker} from "@/components/ui/date-picker";

interface fieldRendererProps {
    field: FieldWithDetails;
}

export default function FieldRendererPreview({
                                                 field,
                                             }: fieldRendererProps) {

    if (!field.fieldType) return null;

    const isRequired = field.options.find(option => option.key === "is-required")?.value === "true";
    const placeholder = field.options.find(option => option.key === "placeholder-text")?.value || "";

    if (field.fieldType.component === "single-select") {
        return (
            <Select>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={placeholder || "Select an option"}></SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {field.selectOptions?.map(option => (

                        <SelectItem value={option.id}>
                            <Icon name={option.icon as IconName ?? ''} className="size-4 mr-2"/>
                            {
                                option.name
                            }</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (field.fieldType.component === "text") {
        return (
            <Input

                placeholder={placeholder}
                required={isRequired}
            />
        );
    }

    if (field.fieldType.component === "textarea") {
        return (
            <Textarea
                placeholder={placeholder}
                required={isRequired}
            />
        );
    }

    if (field.fieldType.component === "date") {
        return (
            <DatePicker
            />
        );
    }

    return (
        null
    )
}