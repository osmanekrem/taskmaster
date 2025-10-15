import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useAuthenticatedUser} from "@/lib/auth-client";
import {Button} from "@/components/ui/button";
import {useLogout} from "@/features/auth/lib/actions";
import UserAvatar from "@/components/user-avatar";
import {LogOutIcon, SettingsIcon} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {SidebarMenuButton} from "@/components/ui/sidebar";

export default function UserMenu() {
    const session = useAuthenticatedUser()
    const {mutate: logout, isPending} = useLogout()

    if (!session) {
        return null
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                    <UserAvatar user={session.user}/>
                    <p className="truncate">

                        {session.user.name}
                    </p>
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card space-y-1">
                <DropdownMenuLabel
                    className="p-2 h-12 flex items-center w-full justify-start gap-x-2">
                    <UserAvatar user={session.user}/>
                    <div className="flex flex-col">
                        <p className="text-sm font-semibold">
                            {session.user.name}
                        </p>
                        <p className="text-sm font-light">
                            {session.user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator/>
                <DropdownMenuItem>
                    <Link
                        className="w-full text-foreground flex items-center gap-x-2"
                        to="/settings"
                    >
                        <SettingsIcon className="text-foreground"/>
                        Ayarlar
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator/>
                <DropdownMenuItem asChild>
                    <Button
                        variant="destructive"
                        className="w-full text-foreground"
                        disabled={isPending}
                        onClick={() => logout()}
                    >
                        <LogOutIcon className="text-foreground"/>
                        Çıkış Yap
                    </Button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
