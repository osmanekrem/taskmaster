import FieldRendererPreview from "@/features/fields/ui/components/field-renderer-preview";

interface TicketTypePreviewProps {
    fields: any[];
}


export default function TicketTypePreview({
                                                fields,
    }: TicketTypePreviewProps) {
  return <div className="flex flex-col gap-6 h-full overflow-y-auto p-4">{fields.map((field) => <FieldRendererPreview field={field} />)}</div>;
}