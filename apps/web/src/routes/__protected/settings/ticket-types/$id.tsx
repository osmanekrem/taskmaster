import { createFileRoute } from "@tanstack/react-router";
import TicketTypeDetail from "@/features/ticket-types/ui/views/ticket-type-detail";
import { getTicketTypeQuery } from "@/features/ticket-types/lib/queries";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/__protected/settings/ticket-types/$id")({
  component: TicketTypeDetail,
  loader: async ({ context, params }) => {
    const { id } = params;
    return await context.queryClient.ensureQueryData(
      getTicketTypeQuery(id ?? "")
    );
  },
  errorComponent: ({ error }) => {
    throw redirect({
      to: "/settings/ticket-types",
      params: { replace: true },
    });
  },
});
