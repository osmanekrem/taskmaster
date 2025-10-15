import {mutationOptions, queryOptions} from "@tanstack/react-query";
import {queryClient, trpcClient} from "@/utils/trpc";
import {authClient, type User} from "@/lib/auth-client";
import {createUser, deleteUser, editUser} from "./actions";
import {toast} from "sonner";
import type {CreateUserSchema} from "@/features/user-management/schemas";

export const getUserQuery = (userId: string) => queryOptions({
    queryKey: ['user', userId],
    queryFn: () => {
        return trpcClient.user.getUserById.query(
            {userId}
        )
    }
});

export const getUsersQuery = (limit: number, offset: number) => queryOptions({
    queryKey: ['user'],
    queryFn: () => {
        if (limit <= 0) {
            throw new Error("Limit must be greater than 0");
        }
        return authClient.admin.listUsers({
            query: {
                limit,
                offset,
            }
        })
    }
})

export const deleteUserQuery = (userId: string) => mutationOptions({
    mutationFn: () => {
        return deleteUser({userId});
    },
    onSuccess: () => {
        queryClient.invalidateQueries({queryKey: ["user", userId]});
        queryClient.setQueryData(
            ["user"], (oldData: { data: { users: User[], total: number } } | undefined) => {
                if (!oldData || !oldData.data) return {data: [], total: 0};
                const updatedUsers = oldData.data.users.filter(user => user.id !== userId);
                return {data: {users: updatedUsers, total: oldData.data.total - 1}};
            }
        )

        toast.success("Kullanıcı başarıyla silindi");
    },
    onError: (error) => {
        toast.error(`Kullanıcı silinirken hata oluştu: ${error.message}`);
    }
})

export const createUserQuery = mutationOptions({
    mutationFn: (data: CreateUserSchema) => {
        return createUser(data);
    },
    onSuccess: (user) => {
        queryClient.setQueryData(
            ["user"], (oldData: { data: { users: User[], total: number } } | undefined) => {
                if (!oldData || !oldData.data) return {data: [user], total: 1};
                return {data: {users: [...oldData.data.users, user.user], total: oldData.data.total + 1}};
            }
        )
        toast.success("Kullanıcı başarıyla oluşturuldu");
    },
})

export const editUserQuery = (userId: string) => mutationOptions({
    mutationFn: editUser,
    onSuccess: () => {
        toast.success("Kullanıcı başarıyla düzenlendi");
        queryClient.invalidateQueries({queryKey: ["user", userId]});
        queryClient.invalidateQueries({queryKey: ["user"]});
    },
    onError: error => {
        toast.error(error.message);
    }
})