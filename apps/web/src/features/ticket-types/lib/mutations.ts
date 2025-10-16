import type { RouterInput, RouterOutput } from "@/utils/trpc";
import { queryClient, trpcClient } from "@/utils/trpc";
import { mutationOptions } from "@tanstack/react-query";

type CreateTicketTypeRequestType =
  RouterInput["ticketTypes"]["createTicketType"];
type CreateTicketTypeResponseType =
  RouterOutput["ticketTypes"]["createTicketType"];

export const createTicketTypeMutation = mutationOptions<
  CreateTicketTypeResponseType,
  Error,
  CreateTicketTypeRequestType
>({
  mutationFn: (data: CreateTicketTypeRequestType) => {
    return trpcClient.ticketTypes.createTicketType.mutate(data);
  },
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
    queryClient.invalidateQueries({
      queryKey: ["ticket-type", res?.data?.[0]?.id],
    });
  },
});

type EditTicketTypeRequestType = RouterInput["ticketTypes"]["editTicketType"];
type EditTicketTypeResponseType = RouterOutput["ticketTypes"]["editTicketType"];

export const editTicketTypeMutation = mutationOptions<
  EditTicketTypeResponseType,
  Error,
  EditTicketTypeRequestType
>({
  mutationFn: (data: EditTicketTypeRequestType) => {
    return trpcClient.ticketTypes.editTicketType.mutate(data);
  },
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
    queryClient.invalidateQueries({
      queryKey: ["ticket-type", res?.data?.[0]?.id],
    });
  },
});

type DeleteTicketTypeRequestType =
  RouterInput["ticketTypes"]["deleteTicketType"];
type DeleteTicketTypeResponseType =
  RouterOutput["ticketTypes"]["deleteTicketType"];

export const deleteTicketTypeMutation = mutationOptions<
  DeleteTicketTypeResponseType,
  Error,
  DeleteTicketTypeRequestType
>({
  mutationFn: (data: DeleteTicketTypeRequestType) => {
    return trpcClient.ticketTypes.deleteTicketType.mutate(data);
  },
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
    queryClient.invalidateQueries({
      queryKey: ["ticket-type", res?.data?.[0]?.id],
    });
  },
});
