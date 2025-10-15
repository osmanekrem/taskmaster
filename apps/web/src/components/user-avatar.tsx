import {cn} from "@/lib/utils";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import type {User} from "@/lib/auth-client";

interface UserAvatarProps {
    className?: string;
    user?: User;
    size?: number;
}

export default function UserAvatar({
                                       className = "",
                                       user,
                                       size = 32,
                                   }: UserAvatarProps) {

    if (!user) {
        return (
            <Avatar
                className={cn("text-sm", className)}
                style={{width: size, height: size}}
            >
                <AvatarFallback className="text-xs">
                    ?
                </AvatarFallback>
            </Avatar>
        );
    }
    return (
        <Avatar
            className={cn("text-sm", className)}
            style={{width: size, height: size}}
        >
            <AvatarImage src={user?.image ?? undefined} alt={user.firstName + " " + user.lastName}/>
            <AvatarFallback className="text-xs">
                {user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase()
                }
            </AvatarFallback>
        </Avatar>
    );
}