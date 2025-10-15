import {createFileRoute} from '@tanstack/react-router'
import CreateUserForm from "@/features/user-management/ui/views/create-user-form";
import GoBackButton from "@/components/go-back-button";

export const Route = createFileRoute(
    '/__protected/__admin/user-management/create-user',
)({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="flex flex-col w-full h-full">
            <div className="flex justify-between items-center w-full mb-4">
                <div className="flex items-center gap-x-2">
                    <GoBackButton to="/user-management"/>

                    <h1 className="text-2xl font-bold leading-tight truncate">
                        Kullanıcı Ekle
                    </h1>
                </div>
            </div>

            <CreateUserForm/>

        </div>
    )
}
