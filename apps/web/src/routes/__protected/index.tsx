import {createFileRoute, redirect} from "@tanstack/react-router";

export const Route = createFileRoute("/__protected/")({
    beforeLoad: () => {
        throw redirect({ to: '/dashboard' })
    }
});