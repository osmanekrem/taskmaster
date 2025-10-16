import { useForm } from "@tanstack/react-form";
import { createTicketTypeSchema } from "@/features/ticket-types/schemas";
import { createTicketTypeMutation } from "@/features/ticket-types/lib/mutations";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import TicketTypeIconSelect from "../components/ticket-type-icon-select";
import useAddTicketTypeModal from "@/features/ticket-types/hooks/use-add-ticket-type-modal";

export default function AddTicketTypeForm() {
  const createTicketType = useMutation(createTicketTypeMutation);
  const { close } = useAddTicketTypeModal();
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      icon: "",
    },
    onSubmit: async ({ value }) => {
      await createTicketType.mutateAsync(value, {
        onSuccess: () => {
          toast.success("Bilet türü başarıyla oluşturuldu");
          form.reset();
          close();
        },
        onError: () => {
          toast.error("Bilet türü oluşturulurken bir hata oluştu");
        },
      });
    },
    validators: {
      onSubmit: createTicketTypeSchema,
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
      <h2 className="text-lg font-medium">Bilet Türü Ekle</h2>
      <div>
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Bilet Türü Adı</Label>
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
        <form.Field name="icon">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Bilet Türü Simgesi</Label>
              <TicketTypeIconSelect
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
              <Label htmlFor={field.name}>Bilet Türü Açıklaması</Label>
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
            {state.isSubmitting ? "Gönderiliyor..." : "Bilet Türü Ekle"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
