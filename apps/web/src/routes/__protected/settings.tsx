import {createFileRoute} from '@tanstack/react-router'
import GoBackButton from "@/components/go-back-button";
import ChangePasswordForm from "@/features/auth/ui/views/change-password-form";

export const Route = createFileRoute('/__protected/settings')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div className="flex flex-col w-full h-full gap-8">
        <div className="flex justify-between items-center w-full mb-4">
            <div className="flex items-center gap-x-2">
                <GoBackButton to="/dashboard"/>
                <h1 className="text-2xl font-bold leading-tight truncate">
                    Ayarlar
                </h1>
            </div>
        </div>

        <div className="flex flex-col w-full space-y-4">

            <h2 className="text-xl font-bold leading-tight truncate">
                Şifre Değiştir
            </h2>
            <ChangePasswordForm/>
        </div>

    </div>
}
