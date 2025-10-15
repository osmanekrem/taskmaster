import {createFileRoute, Outlet, redirect} from '@tanstack/react-router'
import {SidebarProvider} from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/sidebar/app-sidebar";

export const Route = createFileRoute('/__protected')({
    component: RouteComponent,
    beforeLoad: async ({context}) => {
        if (!context.userSession) {
            throw redirect({to: '/login'})
        }
    }
})

function RouteComponent() {

    return (<SidebarProvider>
        <AppSidebar/>
        <main className="flex-1 min-w-0 h-svh flex flex-col px-2.5 md:px-10 py-6">

            <div className="flex-1 min-h-0 w-full flex flex-col">

                <Outlet/>
            </div>
        </main>
    </SidebarProvider>)
}
