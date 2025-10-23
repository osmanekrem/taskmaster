import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getFieldTypesQuery } from "@/features/fields/lib/queries";
import { Icon } from "@/components/ui/icon-picker";

interface FieldTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function FieldTypeSelect({
  value,
  onChange,
}: FieldTypeSelectProps) {
  const { data: fieldTypes } = useQuery(getFieldTypesQuery);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue
          className="flex items-center gap-2 w-full"
          placeholder="Alan tipi seç"
        />
      </SelectTrigger>
      <SelectContent>
        {fieldTypes?.data.map((fieldType) => (
          <SelectItem key={fieldType.id} value={fieldType.id}>
            <Icon name={fieldType.icon ?? ""} />
            {fieldType.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
