import {queryOptions} from "@tanstack/react-query";
import {authClient} from "@/lib/auth-client";

export const authQueries = {
    all: ['auth'],
    user: () => queryOptions({
        queryKey: [...authQueries.all, 'user'],
        queryFn: () => authClient.getSession(),
        staleTime: 1000 * 60 * 5,
    })
}