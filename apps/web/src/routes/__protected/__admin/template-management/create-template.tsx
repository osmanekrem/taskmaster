import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/__protected/__admin/template-management/create-template',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>Hello "/__protected/__admin/template-management/create-template"!</div>
  )
}
