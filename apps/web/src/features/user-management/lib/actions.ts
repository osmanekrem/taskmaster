import type {CreateUserSchema, EditUserSchema} from "@/features/user-management/schemas";
import {authClient} from "@/lib/auth-client";

export async function createUser(data: CreateUserSchema) {
    const {error, data: response} = await authClient.admin.createUser({
        email: data.email,
        password: data.password,
        name: data.firstName + " " + data.lastName,
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
        }
    });

    if (error) {
        throw new Error(error.message);
    }

    return response;
}

export async function editUser({userId, data}: { userId: string, data: EditUserSchema }) {
    const {error, data: response} = await authClient.admin.updateUser({
        userId,
        data: {
            email: data.email,
            name: data.firstName + " " + data.lastName,
            firstName: data.firstName,
            lastName: data.lastName,
        }
    });

    if (error) {
        throw new Error(error.message);
    }

    return response;
}

export async function setUserPassword({userId, password}: { userId: string, password: string }) {
    const {error} = await authClient.admin.setUserPassword({
        userId,
        newPassword: password,
    });

    if (error) {
        throw new Error(error.message);
    }
}

export async function deleteUser({userId}: { userId: string }) {
    const {error} = await authClient.admin.removeUser({
        userId,
    });

    if (error) {
        throw new Error(error.message);
    }
}