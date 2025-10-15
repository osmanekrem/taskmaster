import {createFileRoute} from '@tanstack/react-router'
import ResetPasswordForm from "@/features/auth/ui/views/reset-password-form";
import {resetPasswordSearchSchema} from "@/features/auth/schemas";

export const Route = createFileRoute('/__auth/reset-password')({
    component: RouteComponent,
    validateSearch: resetPasswordSearchSchema
})

function RouteComponent() {
    const {token} = Route.useSearch();
    return <div className="grid grid-cols-1 w-full">
        <h1 className="text-3xl font-bold w-full justify-center text-center flex mb-6">
            Şifremi Sıfırla
        </h1>
        <ResetPasswordForm token={token}/>

    </div>
}
