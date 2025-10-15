import {createFileRoute} from '@tanstack/react-router'
import TemplateManagement from "@/features/templates/ui/views/template-management";

export const Route = createFileRoute(
    '/__protected/__admin/template-management/',
)({
    component: RouteComponent,
})

function RouteComponent() {
    return <TemplateManagement/>
}
