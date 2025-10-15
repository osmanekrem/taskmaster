import {createFileRoute} from '@tanstack/react-router'
import ForgotPasswordForm from "@/features/auth/ui/views/forgot-password-form";

export const Route = createFileRoute('/__auth/forgot-password')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div className="grid grid-cols-1 w-full">
        <h1 className="text-3xl font-bold w-full justify-center text-center flex mb-6">
            Şifremi Unuttum
        </h1>
        <ForgotPasswordForm/>

    </div>
}
