import {useQuery} from "@tanstack/react-query";
import {getFieldsForTicketTypeQuery} from "@/features/ticket-types/lib/queries";
import {useEffect, useState} from "react";
import {ListGroup, ListHeader, ListItem, ListItems, ListProvider} from "@/components/ui/shadcn-io/list";
import type {DragEndEvent} from "@dnd-kit/core";
import {getFieldsQuery} from "@/features/fields/lib/queries";
import {Item, ItemActions, ItemContent, ItemMedia, ItemTitle} from "@/components/ui/item";
import {Icon} from "@/components/ui/icon-picker";

interface TicketTypeFields {
    id: string;
}

const statuses = [
    {id: 0, name: "Atanmış"},
    {id: 1, name: "Atanmadı"},
];

export default function TicketTypeFields({id}: TicketTypeFields) {
    const {data} = useQuery(getFieldsForTicketTypeQuery(id))
    const {data: fieldsData} = useQuery(getFieldsQuery)

    const [fields, setFields] = useState<any[]>([]);

    useEffect(() => {
        setFields(fieldsData?.data.map(
            field => ({
                ...field,
                status: data?.some((item) => item.field.id === field.id) ? statuses[0] : statuses[1],
            })
        ) || []);
    }, [fieldsData]);


    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (!over) {
            return;
        }
        const status = statuses.find((status) => status.name === over.id);
        if (!status) {
            return;
        }
        setFields(
            fields.map((field) => {
                if (field.id === active.id) {
                    return {...field, status};
                }
                return field;
            })
        );
    };
    return (
        <ListProvider onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-2">
                {statuses.map((status) => (
                    <ListGroup id={status.name} key={status.name}
                               className="bg-background/50 border border-border rounded-lg">
                        <ListHeader className="rounded-t-lg" color={""} name={status.name}/>
                        <ListItems>
                            {fields
                                .filter((field) => field.status.name === status.name)
                                .map((field, index) => (
                                    <ListItem
                                        id={field.id}
                                        index={index}
                                        key={field.id}
                                        name={field.name}
                                        parent={field.status.name}

                                    >
                                        <ItemMedia>
                                            <Icon className="size-4" name={field.icon}/>
                                        </ItemMedia>
                                        <ItemContent>
                                            <ItemTitle>
                                                {field.name}
                                            </ItemTitle>
                                        </ItemContent>
                                        <ItemActions>
                                            sa
                                        </ItemActions>
                                    </ListItem>
                                ))}
                        </ListItems>
                    </ListGroup>
                ))}
            </div>
        </ListProvider>
    );
}