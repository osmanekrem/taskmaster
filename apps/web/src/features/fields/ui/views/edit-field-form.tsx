import {useForm} from "@tanstack/react-form";
import {useMutation, useQuery} from "@tanstack/react-query";
import {toast} from "sonner";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {editFieldSchema} from "@/features/fields/schemas";
import FieldTypeSelect from "@/features/fields/ui/components/field-type-select";
import {editFieldMutation} from "@/features/fields/lib/mutations";
import useEditFieldModal from "@/features/fields/hooks/use-edit-field-modal";
import {getFieldQuery, getFieldTypesQuery} from "@/features/fields/lib/queries";
import FieldTypeIconSelect from "@/features/fields/ui/components/field-type-icon-select";
import {Textarea} from "@/components/ui/textarea";

interface EditFieldFormProps {
    fieldId: string;
}

export default function EditFieldForm(
    {fieldId}: EditFieldFormProps
) {
    const createField = useMutation(editFieldMutation);
    const {data} = useQuery(getFieldQuery(fieldId));
    const {data: fieldTypes} = useQuery(getFieldTypesQuery);
    const {close} = useEditFieldModal();
    const form = useForm({
        defaultValues: {
            fieldId: fieldId,
            name: data?.data?.name ?? "",
            description: data?.data?.description ?? "",
            icon: data?.data?.icon ?? "",
            fieldTypeId: data?.data?.fieldTypeId ?? "",
        },
        onSubmit: async ({value}) => {
            await createField.mutateAsync(value, {
                onSuccess: () => {
                    toast.success("Alan başarıyla düzenlendi");
                    form.reset();
                    close();
                },
                onError: () => {
                    toast.error("Alan düzenlenirken bir hata oluştu");
                },
            });
        },
        validators: {
            onSubmit: editFieldSchema,
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
            <h2 className="text-lg font-medium">Alan Düzenle</h2>
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

            <div>
                <form.Field name="description">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>
                                Alan Açıklaması
                            </Label>
                            <Textarea
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
                        {state.isSubmitting ? "Gönderiliyor..." : "Kaydet"}
                    </Button>
                )}
            </form.Subscribe>
        </form>
    );
}
