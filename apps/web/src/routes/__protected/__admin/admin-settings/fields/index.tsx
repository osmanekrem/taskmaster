import { createFileRoute } from '@tanstack/react-router';
import FieldsIndex from '@/features/fields/ui/views/fields-index';

export const Route = createFileRoute(
  '/__protected/__admin/admin-settings/fields/',
)({
  component: FieldsIndex,
});
