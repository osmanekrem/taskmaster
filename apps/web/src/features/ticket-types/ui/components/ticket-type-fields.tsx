import {useState} from "react";
import FieldSelector from "@/features/fields/ui/components/field-selector";
import TicketTypePreview from "@/features/ticket-types/ui/components/ticket-type-preview";

interface TicketTypeFields {
    id: string;
}

export default function TicketTypeFields({id}: TicketTypeFields) {
    const [fields, setFields] = useState<any[]>([]);

    return (
        <div className="flex w-full flex-1 min-h-0 gap-2.5 border-t pt-4">
            <div className="flex flex-col flex-1 min-w-0 space-y-4">
                <TicketTypePreview fields={fields} setFields={setFields} id={id}/>
            </div>
            <div className="flex flex-col min-w-0 w-full max-w-xs space-y-4">
                <h2 className="text-xl font-bold leading-tight truncate">
                    Alanlar
                </h2>
                <FieldSelector fields={fields} setFields={setFields}/>
            </div>
        </div>
    );
}
