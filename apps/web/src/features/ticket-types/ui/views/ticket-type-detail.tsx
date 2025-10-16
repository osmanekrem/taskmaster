import {
    notFound,
    redirect,
    useLoaderData,
    useParams,
} from "@tanstack/react-router";
import {Route} from "@/routes/__protected/settings/ticket-types/$id";
import {useQuery, useSuspenseQuery} from "@tanstack/react-query";
import {getTicketTypeQuery} from "@/features/ticket-types/lib/queries";
import TicketTypeIcon from "../components/ticket-type-icon";
import {Button} from "@/components/ui/button";
import {PencilIcon} from "lucide-react";
import useEditTicketTypeModal from "@/features/ticket-types/hooks/use-edit-ticket-type-modal";
import EditTicketTypeModal from "../components/edit-ticket-type-modal";
import DeleteTicketTypeButton from "../components/delete-ticket-type-button";

export default function TicketTypeDetail() {
    const {id} = useParams({from: Route.id});
    const data = Route.useLoaderData()
    const {open} = useEditTicketTypeModal();

    return (
        <div className="flex flex-col w-full h-full space-y-4">
            <EditTicketTypeModal/>
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold leading-tight flex items-center gap-2 truncate">
                    <TicketTypeIcon name={data.icon ?? ""}/>
                    {data.name}
                </h2>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => open(id)}>
                        <PencilIcon className="size-4"/>
                        Düzenle
                    </Button>
                    <DeleteTicketTypeButton id={id}/>
                </div>
            </div>
            {data?.description && (
                <p className="text-sm text-muted-foreground">
                    {data.description}
                </p>
            )}
        </div>
    );
}
