import { createFileRoute } from "@tanstack/react-router";
import TicketTypes from "@/features/ticket-types/ui/views/ticket-types";

export const Route = createFileRoute("/__protected/settings/ticket-types")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TicketTypes />;
}
