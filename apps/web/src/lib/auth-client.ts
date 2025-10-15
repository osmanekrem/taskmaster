import {createAuthClient} from "better-auth/react";
import {useQuery} from "@tanstack/react-query";
import {authQueries} from "@/lib/queries";
import {adminClient, inferAdditionalFields} from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL:
    import.meta.env.VITE_SERVER_URL,
    plugins: [
        adminClient(),
        inferAdditionalFields({
            user: {
                firstName: {
                    type: "string",
                    required: true,
                },
                lastName: {
                    type: "string",
                    required: true
                },

            }
        })
    ]
});

export const useAuthentication = () => {
    const {data: session} = useQuery(authQueries.user())

    return {userSession: session?.data, isAuthenticated: !!session?.data}
}

export const useAuthenticatedUser = () => {
    const {userSession, isAuthenticated} = useAuthentication()

    if (!isAuthenticated || !userSession) {
        return null
    }

    return userSession
}

export type User = typeof authClient.$Infer.Session.user