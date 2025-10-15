import {createFileRoute, Outlet, redirect} from '@tanstack/react-router'

export const Route = createFileRoute('/__protected/__admin')({
    component: RouteComponent,
    beforeLoad: async ({context}) => {
        if (!context.userSession?.user.role || context.userSession.user.role !== 'admin') {
            throw redirect({to: '/dashboard'})
        }
    }
})

function RouteComponent() {
    return <Outlet/>
}
