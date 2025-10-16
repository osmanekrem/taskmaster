import {createFileRoute} from "@tanstack/react-router";
import TicketTypes from "@/features/ticket-types/ui/views/ticket-types";
import NotFound from "@/components/not-found";

export const Route = createFileRoute("/__protected/settings/ticket-types")({
    component: TicketTypes,
    notFoundComponent: () => <NotFound/>,
});
