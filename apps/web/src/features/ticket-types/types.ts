import type {RouterOutput} from "@/utils/trpc";

export type TicketType = RouterOutput["ticketTypes"]["getTicketTypeById"][number];