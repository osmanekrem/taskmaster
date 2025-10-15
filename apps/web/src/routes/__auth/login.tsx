import SignInForm from "@/features/auth/ui/views/sign-in-form";
import {createFileRoute} from "@tanstack/react-router";

export const Route = createFileRoute("/__auth/login")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="grid grid-cols-1 w-full">
            <h1 className="text-3xl w-full justify-center font-bold text-center flex mb-6">
                Giriş Yap
            </h1>
            <SignInForm/>

        </div>
    )
}
