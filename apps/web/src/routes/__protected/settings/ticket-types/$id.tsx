import {createFileRoute, notFound} from "@tanstack/react-router";
import TicketTypeDetail from "@/features/ticket-types/ui/views/ticket-type-detail";
import {getTicketTypeQuery} from "@/features/ticket-types/lib/queries";
import {redirect} from "@tanstack/react-router";
import NotFound from "@/components/not-found";

export const Route = createFileRoute("/__protected/settings/ticket-types/$id")({
    component: TicketTypeDetail,
    loader: async ({context, params}) => {
        const {id} = params;
        const {data} = await context.queryClient.fetchQuery(
            getTicketTypeQuery(id ?? "")
        );
        if (!data) {
            throw notFound();
        }
        return data;
    },
    notFoundComponent: () => <NotFound/>,
});
