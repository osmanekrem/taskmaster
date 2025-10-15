import {createFileRoute} from '@tanstack/react-router'
import {queryClient} from "@/utils/trpc";
import {getUserQuery} from "@/features/user-management/lib/queries";
import EditUserForm from "@/features/user-management/ui/views/edit-user-form";
import GoBackButton from "@/components/go-back-button";
import SetPasswordForm from "@/features/user-management/ui/views/set-password-form";
import {Separator} from "@/components/ui/separator";

export const Route = createFileRoute(
    '/__protected/__admin/user-management/edit-user/$id',
)({
    component: RouteComponent,
    loader: async ({params}) => {
        if (!params.id) {
            throw new Error("User ID is required");
        }
        const {data} = await queryClient.fetchQuery(getUserQuery(params.id));
        return data
    }
})

function RouteComponent() {
    const user = Route.useLoaderData()

    return (
        <div className="flex flex-col w-full h-full gap-8">
            <div className="flex justify-between items-center w-full mb-4">
                <div className="flex items-center gap-x-2">
                    <GoBackButton to="/user-management"/>
                    <h1 className="text-2xl font-bold leading-tight truncate">
                        Kullanıcı Düzenle
                    </h1>
                </div>
            </div>

            <div className="flex flex-col w-full space-y-4">

                <h2 className="text-xl font-bold leading-tight truncate">
                    Kullanıcı Bilgileri
                </h2>
                <EditUserForm user={user}/>
            </div>

            <Separator/>

            <div className="flex flex-col w-full space-y-4">

                <h2 className="text-xl font-bold leading-tight truncate">
                    Şifre Değiştir
                </h2>
                <SetPasswordForm userId={user.id}/>
            </div>
        </div>
    )
}
