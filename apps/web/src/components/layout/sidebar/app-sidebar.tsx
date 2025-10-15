import {
    Sidebar,
    SidebarContent, SidebarFooter,
    SidebarGroup,
    SidebarGroupContent, SidebarHeader,
    SidebarMenu, SidebarMenuButton,
    SidebarMenuItem, SidebarRail, SidebarSeparator, useSidebar
} from "@/components/ui/sidebar";
import {Link} from "@tanstack/react-router";
import {LayoutDashboardIcon, SidebarCloseIcon, SidebarOpenIcon} from "lucide-react";
import UserMenu from "@/features/auth/ui/components/user-menu";
import AdminMenu from "@/components/layout/sidebar/admin-menu";
import {useAuthenticatedUser} from "@/lib/auth-client";
import {Button} from "@/components/ui/button";

const links = [
    {to: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon},
];
export default function AppSidebar() {
    const session = useAuthenticatedUser()
    const {open, toggleSidebar} = useSidebar()

    if (!session) {
        return null
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenuButton size="lg"
                                   onClick={toggleSidebar}
                                   className="relative flex w-full items-center group/trigger justify-start overflow-hidden">
                    {open ? (
                        <>
                            <p className={"font-extrabold text-3xl leading-8 z-10 text-nowrap tracking-tight"}>Enalayz
                                App</p>
                            <p>1.0</p>
                            <span className="absolute bottom-2 left-1 w-2/3 h-2 z-0 bg-blue-500"></span>
                            <span className="absolute bottom-2 right-2 w-2 h-2 z-0 bg-blue-500"></span>
                            <span className="absolute bottom-2 right-6 w-2 h-2 z-0 bg-blue-500"></span>

                            <span className="absolute bottom-2 right-10 w-2 h-2 z-0 bg-blue-500"></span>
                            <SidebarCloseIcon
                                className="absolute z-10 right-2 top-1/2 -translate-y-1/2 !size-5 opacity-0 group-hover/trigger:opacity-100 transition-all"/>

                        </>
                    ) : (
                        <>
                            <p className={"font-extrabold group-hover/trigger:opacity-0 text-xl leading-8 z-10 flex w-full text-center justify-center text-nowrap tracking-tight"}>EA</p>

                            <span className="absolute bottom-2 left-0 w-full h-2 z-0 bg-blue-500"></span>
                            <SidebarOpenIcon
                                className=" absolute z-10 top-1/2 -translate-y-1/2 left-1/2 !size-5 -translate-x-1/2 opacity-0 group-hover/trigger:opacity-100 transition-all"/>
                        </>
                    )}


                </SidebarMenuButton>
            </SidebarHeader>
            <SidebarSeparator/>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {links.map((item) => (
                                <SidebarMenuItem key={item.label}>
                                    <SidebarMenuButton asChild>
                                        <Link to={item.to}>
                                            <item.icon/>
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                {session.user.role === "admin" && <AdminMenu/>}
            </SidebarContent>
            <SidebarSeparator/>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <UserMenu/>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail/>
        </Sidebar>
    )
}