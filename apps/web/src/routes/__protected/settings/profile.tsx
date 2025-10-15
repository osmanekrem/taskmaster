import {createFileRoute} from '@tanstack/react-router'
import ChangePasswordForm from "@/features/auth/ui/views/change-password-form";

export const Route = createFileRoute('/__protected/settings/profile')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="flex flex-col w-full space-y-4">

            <h2 className="text-xl font-bold leading-tight truncate">
                Şifre Değiştir
            </h2>
            <ChangePasswordForm/>
        </div>
    )
}
