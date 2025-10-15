import {authClient} from "@/lib/auth-client";
import {useRouter} from "@tanstack/react-router";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import type {
    ChangePasswordSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    SignInSchema
} from "@/features/auth/schemas";

export function useLogout() {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => authClient.signOut(),
        onSuccess: async () => {
            queryClient.clear();
            await router.navigate({to: "/login", replace: true});
        }
    });
}

export async function signIn(data: SignInSchema) {
    const {error, data: response} = await authClient.signIn.email({
        email: data.email,
        password: data.password,
    })

    if (error) {
        if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
            throw new Error("Hatalı e-posta veya şifre")
        } else {
            throw new Error(error.message)
        }
    }

    return response
}

export async function forgotPassword(data: ForgotPasswordSchema) {
    const {error} = await authClient.forgetPassword({
        email: data.email,
        redirectTo: import.meta.env.VITE_WEB_URL + '/reset-password',
    })

    if (error) {
        throw new Error(error.message)
    }
}

export async function resetPassword(data: ResetPasswordSchema) {

    if (data.password !== data.passwordConfirm) {
        throw new Error("Şifreler eşleşmiyor")
    }

    const {error} = await authClient.resetPassword({
        newPassword: data.password,
        token: data.token,
    })

    if (error) {
        throw new Error("Şifre sıfırlama işlemi başarısız oldu: " + error.message);
    }
}

export async function changePassword(data: ChangePasswordSchema) {
    const {error} = await authClient.changePassword({
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
        revokeOtherSessions: true,
    })

    if (error) {
        throw new Error("Şifre değiştirme işlemi başarısız oldu: " + error.message);
    }
}