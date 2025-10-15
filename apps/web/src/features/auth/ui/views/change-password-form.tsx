import {useForm} from "@tanstack/react-form";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {useMutation} from "@tanstack/react-query";
import {changePassword} from "@/features/auth/lib/actions";
import {changePasswordSchema} from "@/features/auth/schemas";
import {toast} from "sonner";
import InputPassword from "@/components/input-password";


export default function ChangePasswordForm() {
    const changePasswordMutation = useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            toast.success("Şifreniz başarıyla değiştirildi");
        },
        onError: error => {
            toast.error(error.message);
        }
    });

    const form = useForm({
        defaultValues: {
            currentPassword: "",
            newPassword: "",
        },
        onSubmit: async ({value}) => {
            await changePasswordMutation.mutateAsync(value)
        },
        validators: {
            onSubmit: changePasswordSchema
        },
    });


    return (

        <form
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
            }}
            className="space-y-4"
        >
            <div>
                <form.Field name="currentPassword">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Mevcut Şifre</Label>
                            <InputPassword
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            {field.state.meta.errors.map((error) => (
                                <p key={error?.message} className="text-destructive">
                                    {error?.message}
                                </p>
                            ))}
                        </div>
                    )}
                </form.Field>
            </div>

            <div>
                <form.Field name="newPassword">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Yeni Şifre</Label>
                            <InputPassword
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            {field.state.meta.errors.map((error) => (
                                <p key={error?.message} className="text-destructive">
                                    {error?.message}
                                </p>
                            ))}
                        </div>
                    )}
                </form.Field>
            </div>

            <form.Subscribe>
                {(state) => (
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={!state.canSubmit || state.isSubmitting}
                    >
                        {state.isSubmitting ? "Gönderiliyor..." : "Şifremi Değiştir"}
                    </Button>
                )}
            </form.Subscribe>
        </form>
    );
}
