import { createFileRoute } from '@tanstack/react-router';
import TicketTypesIndex from '@/features/ticket-types/ui/views/ticket-types-index';

export const Route = createFileRoute(
  '/__protected/__admin/admin-settings/ticket-types/'
)({
  component: TicketTypesIndex,
});
