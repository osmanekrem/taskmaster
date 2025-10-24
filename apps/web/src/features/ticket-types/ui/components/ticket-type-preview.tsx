import {useQuery} from "@tanstack/react-query";
import {getFieldsForTicketTypeQuery} from "@/features/ticket-types/lib/queries";
import {KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider} from "@/components/ui/shadcn-io/kanban";
import {Item, ItemContent, ItemDescription, ItemMedia, ItemTitle} from "@/components/ui/item";
import {Icon} from "@/components/ui/icon-picker";
import FieldRendererPreview from "@/features/fields/ui/components/field-renderer-preview";

interface TicketTypePreviewProps {
    fields: any[];
    setFields: React.Dispatch<React.SetStateAction<any[]>>
    id: string;
}

const columns = [
    {id: "0", name: 'Önizleme'},
];

export default function TicketTypePreview({
                                              fields,
                                              setFields,
                                              id
                                          }: TicketTypePreviewProps) {

    const {data} = useQuery(getFieldsForTicketTypeQuery(id));

    return (
        <KanbanProvider
            columns={columns}
            data={fields.map((ticketType) => ({
                ...ticketType,
                column: "0",
            }))}
            onDataChange={setFields}
        >
            {(column) => (
                <KanbanBoard id={column.id} key={column.id}>
                    <KanbanHeader>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{column.name}</span>
                        </div>
                    </KanbanHeader>
                    <KanbanCards id={column.id}>
                        {(field: (typeof fields)[number]) => (
                            <KanbanCard
                                column={column.id}
                                id={field.id}
                                key={field.id}
                                name={field.name}
                                className="pt-4 pr-4"
                            >
                                            <FieldRendererPreview field={field}/>
                            </KanbanCard>
                        )}
                    </KanbanCards>
                </KanbanBoard>
            )}
        </KanbanProvider>
    )
}