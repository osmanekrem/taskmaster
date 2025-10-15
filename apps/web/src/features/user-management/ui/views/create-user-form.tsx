import {useForm} from "@tanstack/react-form";
import {createUserSchema} from "@/features/user-management/schemas";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import InputPassword from "@/components/input-password";
import {useCreateUser} from "@/features/user-management/lib/api";
import {useNavigate} from "@tanstack/react-router";

export default function CreateUserForm() {
    const createUser = useCreateUser();
    const navigate = useNavigate();

    const form = useForm({
        defaultValues: {
            firstName: "",
            lastName: "",
            password: "",
            email: "",
        },
        onSubmit: async ({value}) => {
            await createUser.mutateAsync(value).then((result) => {
                if (result.user) {
                    navigate({to: "/user-management"});
                }
            })
        },
        validators: {
            onSubmit: createUserSchema
        },
    });

    return (


        <form
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
            }}
            className="space-y-4 w-full h-full"
        >
            <div>
                <form.Field name="firstName">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Ad</Label>
                            <Input
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
                <form.Field name="lastName">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>
                                Soyad
                            </Label>
                            <Input
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
                <form.Field name="email">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>E-Posta</Label>
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

            <form.Subscribe>
                {(state) => (
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={!state.canSubmit || state.isSubmitting}
                    >
                        {state.isSubmitting ? "Gönderiliyor..." : "Kullanıcı Ekle"}
                    </Button>
                )}
            </form.Subscribe>
        </form>
    );
}