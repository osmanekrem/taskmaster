import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/__protected/__admin/admin-settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin-settings/ticket-types' });
  },
});
