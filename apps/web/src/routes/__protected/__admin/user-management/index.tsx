import {createFileRoute} from '@tanstack/react-router'
import UserManagement from "@/features/user-management/ui/views/user-management";

export const Route = createFileRoute('/__protected/__admin/user-management/')({
    component: RouteComponent,
})

function RouteComponent() {
    return <UserManagement/>;
}
