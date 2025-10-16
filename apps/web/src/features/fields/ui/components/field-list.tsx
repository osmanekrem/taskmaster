import {useQuery} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {ChevronRightIcon, PlusIcon} from "lucide-react";
import useAddTicketTypeModal from "@/features/ticket-types/hooks/use-add-ticket-type-modal";
import FieldTypeIcon from "./field-type-icon";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item";
import {Link} from "@tanstack/react-router";
import {getFieldsWithFieldTypeQuery} from "@/features/fields/lib/queries";

export default function FieldList() {
    const {data} = useQuery(getFieldsWithFieldTypeQuery);
    const {open} = useAddTicketTypeModal();
    return (
        <div className="flex flex-col w-full max-w-64 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold leading-tight truncate">
                    Alanlar
                </h2>
                <Button variant="outline" onClick={open}>
                    <PlusIcon className="size-4"/>
                    Ekle
                </Button>
            </div>
            <div className="flex flex-col w-full space-y-4">
                {data?.data?.map((fieldType) => (
                    <Item variant="outline" size="sm" key={fieldType.id} asChild>
                        <Link
                            to="/settings/ticket-types/$id"
                            params={{id: fieldType.id}}
                            activeProps={{
                                className: "bg-primary/10",
                            }}
                            className="w-full"
                        >
                            <ItemMedia>
                                <FieldTypeIcon name={fieldType.fieldType?.icon ?? ""}/>
                            </ItemMedia>
                            <ItemContent>
                                <ItemTitle>{fieldType.name}</ItemTitle>
                            </ItemContent>
                            <ItemActions>
                                <ChevronRightIcon className="size-4"/>
                            </ItemActions>
                        </Link>
                    </Item>
                ))}
            </div>
        </div>
    );
}
