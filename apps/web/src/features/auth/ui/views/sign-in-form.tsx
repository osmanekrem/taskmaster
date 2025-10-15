import {useForm} from "@tanstack/react-form";
import {Link, useNavigate} from "@tanstack/react-router";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {signIn} from "@/features/auth/lib/actions";
import {signInSchema} from "@/features/auth/schemas";
import {useState} from "react";
import InputPassword from "@/components/input-password";


export default function SignInForm() {
    const navigate = useNavigate()
    const queryClient = useQueryClient();

    const [error, setError] = useState<string | null>(null);

    const signInMutation = useMutation({
        mutationFn: signIn,
        onSuccess: () => {
            queryClient.resetQueries()
            navigate({to: "/"})
        },
        onError: (error) => {
            setError(error.message);
        }
    });

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        onSubmit: async ({value}) => {
            await signInMutation.mutateAsync(value)
        },
        validators: {
            onSubmit: signInSchema
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
                <form.Field name="email">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>E-posta</Label>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="email"
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
                <form.Field name="password">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Şifre</Label>
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

            <div className="w-full flex items-center justify-end gap-6">
                <Link to="/forgot-password" className="hover:underline">
                    Şifremi Unuttum
                </Link>
            </div>

            {error && (
                <p className="bg-destructive/25 text-destructive-foreground py-1.5 px-4 rounded-md">
                    {error}
                </p>
            )}


            <form.Subscribe>
                {(state) => (
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={!state.canSubmit || state.isSubmitting}
                    >
                        {state.isSubmitting ? "Gönderiliyor..." : "Giriş Yap"}
                    </Button>
                )}
            </form.Subscribe>
        </form>
    );
}
