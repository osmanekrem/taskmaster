import {useForm} from "@tanstack/react-form";
import {useMutation, useQuery} from "@tanstack/react-query";
import {toast} from "sonner";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {addFieldSchema} from "@/features/fields/schemas";
import FieldTypeSelect from "@/features/fields/ui/components/field-type-select";
import {createFieldMutation} from "@/features/fields/lib/mutations";
import useAddFieldModal from "@/features/fields/hooks/use-add-field-modal";
import FieldTypeIconSelect from "@/features/fields/ui/components/field-type-icon-select";
import {Textarea} from "@/components/ui/textarea";
import {getFieldTypesQuery} from "@/features/fields/lib/queries";

export default function AddFieldForm() {
    const createField = useMutation(createFieldMutation);
    const {data: fieldTypes} = useQuery(getFieldTypesQuery);
    const {close} = useAddFieldModal();
    const form = useForm({
        defaultValues: {
            name: "",
            icon: "",
            fieldTypeId: "",
        },
        onSubmit: async ({value}) => {
            await createField.mutateAsync(value, {
                onSuccess: () => {
                    toast.success("Alan başarıyla oluşturuldu");
                    form.reset();
                    close();
                },
                onError: () => {
                    toast.error("Alan oluşturulurken bir hata oluştu");
                },
            });
        },
        validators: {
            onSubmit: addFieldSchema,
        },
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
            }}
            className="space-y-4 p-4 w-full h-full"
        >
            <h2 className="text-lg font-medium">Alan Ekle</h2>
            <div>
                <form.Field name="name">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Alan Adı *</Label>
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
                <form.Field name="fieldTypeId">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>
                                Alan Türü *
                            </Label>
                            <FieldTypeSelect
                                value={field.state.value}
                                onChange={(value) => {
                                    field.handleChange(value)
                                    const selectedFieldType = fieldTypes?.data.find(ft => ft.id === value);
                                    form.setFieldValue("icon", selectedFieldType?.icon || "")

                                }}
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
                <form.Field name="icon">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>
                                Alan İkonu
                            </Label>
                            <FieldTypeIconSelect
                                value={field.state.value}
                                onChange={(value) => field.handleChange(value)}
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
                        {state.isSubmitting ? "Gönderiliyor..." : "Alan Ekle"}
                    </Button>
                )}
            </form.Subscribe>
        </form>
    );
}
