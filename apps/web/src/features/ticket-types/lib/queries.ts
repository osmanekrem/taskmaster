import {queryOptions} from "@tanstack/react-query";
import {trpcClient} from "@/utils/trpc";

export const getTicketTypesQuery = queryOptions({
    queryKey: ["ticket-types"],
    queryFn: () => {
        return trpcClient.ticketTypes.getTicketTypes.query();
    },
});

export const getTicketTypeQuery = (ticketTypeId: string) =>
    queryOptions({
        queryKey: ["ticket-type", ticketTypeId],
        queryFn: () => {
            return trpcClient.ticketTypes.getTicketTypeById.query({ticketTypeId});
        },
    });

export const getTicketTypesWithFieldsQuery = queryOptions({
    queryKey: ["ticket-types-with-fields"],
    queryFn: () => {
        return trpcClient.ticketTypes.getTicketTypesWithFields.query();
    },
});

export const getFieldsForTicketTypeQuery = (ticketTypeId: string) =>
    queryOptions({
        queryKey: ["fields-for-ticket-type", ticketTypeId],
        queryFn: () => {
            return trpcClient.ticketTypes.getFieldsForTicketType.query({ticketTypeId});
        },
    });