import {useForm} from "@tanstack/react-form";
import {editUserSchema} from "@/features/user-management/schemas";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {type RouterOutput} from "@/utils/trpc";
import {useNavigate} from "@tanstack/react-router";
import {useEditUser} from "@/features/user-management/lib/api";

interface Props {
    user: RouterOutput["user"]["getUserById"]["data"]
}

export default function EditUserForm(
    {user}: Props
) {
    const navigate = useNavigate();

    const editUser = useEditUser(user.id);

    const form = useForm({
        defaultValues: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        },
        onSubmit: async ({value}) => {
            await editUser.mutateAsync({userId: user.id, data: value}).then(
                (result) => {
                    if (result.id) {
                        navigate({to: "/user-management"});
                    }
                }
            )
        },
        validators: {
            onSubmit: editUserSchema
        },
    });

    return (

        <form
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
            }}
            className="space-y-4 w-full"
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


            <form.Subscribe>
                {(state) => (
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={!state.canSubmit || state.isSubmitting}
                    >
                        {state.isSubmitting ? "Gönderiliyor..." : "Kullanıcı Düzenle"}
                    </Button>
                )}
            </form.Subscribe>
        </form>
    );
}